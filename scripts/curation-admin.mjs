// Dev-server plugin for the curation admin (§8.6). Adds a small JSON API that the
// admin page (admin.html) uses to save the owner's images and music into
// public/curation/ and to update public/curation/curation.json. Only active while
// the dev server runs (`npm run dev` / `npm run admin`) — never in a build.
//
// Safety: every request is checked against the real list of rooms, hallways and
// spots (shared with the app via src/content/curation.ts); file names are made
// here, never taken from the client; only image/audio types are accepted.
import { mkdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import { join, resolve, sep } from "node:path";
import { createHash } from "node:crypto";
import { FLOORS } from "../src/config/layout.ts";
import {
  CURATION_VERSION,
  cleanCredit,
  curationTargets,
  emptyCuration,
  fileStem,
  validateCredit,
} from "../src/content/curation.ts";

const API = "/__curation/api/";
const MAX_BODY = 64 * 1024 * 1024; // base64 audio can be large
const IMAGE_TYPES = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };
const AUDIO_TYPES = {
  "audio/mpeg": "mp3",
  "audio/mp3": "mp3",
  "audio/ogg": "ogg",
  "audio/wav": "wav",
  "audio/x-wav": "wav",
  "audio/wave": "wav",
  "audio/mp4": "m4a",
  "audio/x-m4a": "m4a",
  "audio/aac": "m4a",
  "audio/webm": "webm",
};

class HttpError extends Error {
  constructor(status, message, details) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

function sendJSON(res, status, body) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  res.end(JSON.stringify(body));
}

function readBody(req) {
  return new Promise((ok, fail) => {
    const chunks = [];
    let size = 0;
    req.on("data", (c) => {
      size += c.length;
      if (size > MAX_BODY) {
        fail(new HttpError(413, "That file is too large."));
        req.destroy();
      } else chunks.push(c);
    });
    req.on("end", () => {
      try {
        ok(chunks.length ? JSON.parse(Buffer.concat(chunks).toString("utf8")) : {});
      } catch {
        fail(new HttpError(400, "Malformed request."));
      }
    });
    req.on("error", fail);
  });
}

function decodeDataUrl(dataUrl, types) {
  const m = /^data:([\w/+.-]+)(?:;[\w=.-]+)*;base64,(.+)$/s.exec(
    typeof dataUrl === "string" ? dataUrl : "",
  );
  if (!m) throw new HttpError(400, "The file data is missing or malformed.");
  const ext = types[m[1].toLowerCase()];
  if (!ext) throw new HttpError(415, `Files of type ${m[1]} aren't supported here.`);
  const buf = Buffer.from(m[2], "base64");
  if (!buf.length) throw new HttpError(400, "The file is empty.");
  return { ext, buf };
}

const hash = (buf) => createHash("sha1").update(buf).digest("hex").slice(0, 10);

export function curationAdmin() {
  return {
    name: "library-of-babel:curation-admin",
    apply: "serve",
    configureServer(server) {
      const dir = resolve(server.config.root, "public", "curation");
      const manifestPath = join(dir, "curation.json");
      const targets = curationTargets(FLOORS);
      const rooms = new Map(targets.rooms.map((r) => [r.id, r]));
      const halls = new Map(targets.hallways.map((h) => [h.id, h]));

      const load = async () => {
        try {
          const c = JSON.parse(await readFile(manifestPath, "utf8"));
          if (c?.version !== CURATION_VERSION) return emptyCuration();
          return { version: c.version, rooms: c.rooms ?? {}, hallways: c.hallways ?? {} };
        } catch {
          return emptyCuration();
        }
      };
      const save = async (c) => {
        await mkdir(dir, { recursive: true });
        const tmp = `${manifestPath}.tmp`;
        await writeFile(tmp, `${JSON.stringify(c, null, 2)}\n`);
        await rename(tmp, manifestPath);
        server.ws.send({ type: "custom", event: "curation:update" });
      };
      const removeFile = async (rel) => {
        if (typeof rel !== "string" || !rel) return;
        const p = resolve(dir, rel);
        if (p.startsWith(dir + sep)) await rm(p, { force: true });
      };
      const writeFileIn = async (sub, name, buf) => {
        await mkdir(join(dir, sub), { recursive: true });
        await writeFile(join(dir, sub, name), buf);
        return `${sub}/${name}`;
      };

      // One write at a time, so concurrent saves can't clobber the manifest.
      let queue = Promise.resolve();
      const exclusive = (fn) => {
        const run = queue.then(fn, fn);
        queue = run.catch(() => {});
        return run;
      };

      const spot = (body) => {
        const kind = body.kind === "hallway" ? "hallway" : body.kind === "room" ? "room" : null;
        const target =
          kind === "room" ? rooms.get(body.id) : kind === "hallway" ? halls.get(body.id) : null;
        if (!target) throw new HttpError(404, "Unknown room or hallway.");
        if (!target.slots.some((s) => s.id === body.slot))
          throw new HttpError(400, "Unknown spot.");
        return {
          kind,
          id: target.id,
          slot: body.slot,
          section: kind === "room" ? "rooms" : "hallways",
        };
      };
      const credit = (raw) => {
        const c = cleanCredit(raw ?? {});
        const errors = validateCredit(c);
        if (errors.length) throw new HttpError(422, "Some details need attention.", errors);
        return c;
      };
      const volumeOf = (v, fallback) =>
        typeof v === "number" && Number.isFinite(v) ? Math.min(1, Math.max(0, v)) : fallback;

      const routes = {
        "GET ping": async () => ({ ok: true }),

        // Pin an image to a spot (replacing whatever was pinned there).
        "PUT image": (b) =>
          exclusive(async () => {
            const s = spot(b);
            const meta = credit(b.credit);
            const full = decodeDataUrl(b.full, IMAGE_TYPES);
            const thumb = decodeDataUrl(b.thumb, IMAGE_TYPES);
            const stem = `${fileStem(s.id, s.slot)}-${hash(full.buf)}`;
            const c = await load();
            const entry = (c[s.section][s.id] ??= {});
            entry.slots ??= {};
            const old = entry.slots[s.slot];
            const file = await writeFileIn("images", `${stem}.${full.ext}`, full.buf);
            const thumbFile = await writeFileIn("images", `${stem}-thumb.${thumb.ext}`, thumb.buf);
            entry.slots[s.slot] = {
              ...meta,
              file,
              thumb: thumbFile,
              updatedAt: new Date().toISOString(),
            };
            await save(c);
            if (old && old.file !== file) await removeFile(old.file);
            if (old && old.thumb !== thumbFile) await removeFile(old.thumb);
            return { ok: true, image: entry.slots[s.slot] };
          }),

        // Edit a pinned image's details without re-uploading it.
        "PATCH image": (b) =>
          exclusive(async () => {
            const s = spot(b);
            const meta = credit(b.credit);
            const c = await load();
            const img = c[s.section][s.id]?.slots?.[s.slot];
            if (!img) throw new HttpError(404, "Nothing is pinned there.");
            Object.assign(img, meta, { updatedAt: new Date().toISOString() });
            await save(c);
            return { ok: true, image: img };
          }),

        // Unpin: the spot goes back to the downloaded pick.
        "DELETE image": (b) =>
          exclusive(async () => {
            const s = spot(b);
            const c = await load();
            const entry = c[s.section][s.id];
            const img = entry?.slots?.[s.slot];
            if (!img) return { ok: true };
            delete entry.slots[s.slot];
            if (!Object.keys(entry.slots).length) delete entry.slots;
            if (!Object.keys(entry).length) delete c[s.section][s.id];
            await save(c);
            await removeFile(img.file);
            await removeFile(img.thumb);
            return { ok: true };
          }),

        // Set a room's music (replacing its generated bed, §6.6).
        "PUT music": (b) =>
          exclusive(async () => {
            const room = rooms.get(b.id);
            if (!room) throw new HttpError(404, "Unknown room.");
            const meta = credit(b.credit);
            const audio = decodeDataUrl(b.data, AUDIO_TYPES);
            const c = await load();
            const entry = (c.rooms[room.id] ??= {});
            const old = entry.music;
            const file = await writeFileIn(
              "music",
              `${fileStem(room.id, "music")}-${hash(audio.buf)}.${audio.ext}`,
              audio.buf,
            );
            entry.music = {
              ...meta,
              file,
              volume: volumeOf(b.volume, old?.volume ?? 0.6),
              updatedAt: new Date().toISOString(),
            };
            await save(c);
            if (old && old.file !== file) await removeFile(old.file);
            return { ok: true, music: entry.music };
          }),

        "PATCH music": (b) =>
          exclusive(async () => {
            const room = rooms.get(b.id);
            if (!room) throw new HttpError(404, "Unknown room.");
            const c = await load();
            const m = c.rooms[room.id]?.music;
            if (!m) throw new HttpError(404, "This room has no music set.");
            if (b.credit) Object.assign(m, credit(b.credit));
            m.volume = volumeOf(b.volume, m.volume);
            m.updatedAt = new Date().toISOString();
            await save(c);
            return { ok: true, music: m };
          }),

        "DELETE music": (b) =>
          exclusive(async () => {
            const room = rooms.get(b.id);
            if (!room) throw new HttpError(404, "Unknown room.");
            const c = await load();
            const entry = c.rooms[room.id];
            const m = entry?.music;
            if (!m) return { ok: true };
            delete entry.music;
            if (!Object.keys(entry).length) delete c.rooms[room.id];
            await save(c);
            await removeFile(m.file);
            return { ok: true };
          }),
      };

      server.middlewares.use(async (req, res, next) => {
        const url = (req.url ?? "").split("?")[0];
        if (url === "/admin" || url === "/admin/") {
          res.statusCode = 302;
          res.setHeader("Location", "/admin.html");
          res.end();
          return;
        }
        if (!url.startsWith(API)) return next();
        const route = routes[`${req.method} ${url.slice(API.length)}`];
        if (!route) return sendJSON(res, 404, { error: "Not found." });
        try {
          const body = req.method === "GET" ? {} : await readBody(req);
          sendJSON(res, 200, await route(body));
        } catch (e) {
          const status = e instanceof HttpError ? e.status : 500;
          if (status === 500) server.config.logger.error(`[curation] ${e?.stack ?? e}`);
          sendJSON(res, status, {
            error: e instanceof HttpError ? e.message : "Something went wrong saving that.",
            details: e instanceof HttpError ? e.details : undefined,
          });
        }
      });
    },
  };
}
