/**
 * Soundtrack fetcher (§6.6, §8.7). For every pick in src/data/soundtrack.ts it
 * looks the file up on Wikimedia Commons, re-checks its license (CC0 / PD /
 * CC BY / CC BY-SA only, §8.4), downloads an MP3 of it — the original if it's
 * already MP3, else Commons' MP3 transcode — into public/content/music/, and
 * writes public/content/music.json for the app. Files already downloaded are
 * kept, so a re-run only fetches what's missing or newly picked.
 *
 * Run on its own with `npm run fetch:music`; a full `npm run fetch:content`
 * runs it too. Output is git-ignored like the rest of public/content/.
 */
import { mkdir, readdir, rm, stat, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import type { CultureId, License, MusicTrack } from "../src/model/types";
import type { MusicManifest } from "../src/content/types";
import { CULTURE_PLAYLISTS, HOUSE_PLAYLIST, type SoundtrackPick } from "../src/data/soundtrack";
import {
  COMMONS_OK,
  commonsDownload,
  commonsJSON,
  normalizeLicense,
  stripHtml,
} from "./fetch-utils";

const OUT = "public/content";
const MUSIC_DIR = join(OUT, "music");
const MUSIC_URL = "/content/music";
const MANIFEST = join(OUT, "music.json");
const DEFAULT_VOLUME = 0.6;

interface CommonsAudio {
  pageUrl: string;
  mime: string;
  originalUrl: string;
  mp3Url?: string;
  license: string; // LicenseShortName, e.g. "CC BY-SA 3.0"
  artist?: string;
  credit?: string;
}

/** Look up a batch of Commons file pages (≤ 20 per call). */
async function lookup(titles: string[]): Promise<Map<string, CommonsAudio>> {
  const out = new Map<string, CommonsAudio>();
  for (let i = 0; i < titles.length; i += 20) {
    const batch = titles.slice(i, i + 20);
    const params = new URLSearchParams({
      action: "query",
      format: "json",
      formatversion: "2",
      titles: batch.join("|"),
      prop: "videoinfo",
      viprop: "url|mime|extmetadata|derivatives",
      viextmetadatafilter: "LicenseShortName|Artist|Credit",
    });
    const data = await commonsJSON(params);
    // Commons normalizes titles (e.g. Unicode forms); map its titles back to ours.
    const asked = new Map<string, string>(batch.map((t) => [t, t]));
    for (const n of data?.query?.normalized ?? []) asked.set(n.to, n.from);
    for (const page of data?.query?.pages ?? []) {
      const v = page.videoinfo?.[0];
      if (page.missing || !v) continue;
      const m = v.extmetadata ?? {};
      const mp3 = (v.derivatives ?? []).find(
        (d: any) => d.transcodekey === "mp3" || d.type === "audio/mpeg",
      );
      out.set(asked.get(page.title) ?? page.title, {
        pageUrl: (v.descriptionurl ?? "").split("?")[0],
        mime: v.mime ?? "",
        originalUrl: (v.url ?? "").split("?")[0],
        mp3Url: mp3?.src?.split("?")[0],
        license: stripHtml(m.LicenseShortName?.value) ?? "",
        artist: stripHtml(m.Artist?.value),
        credit: stripHtml(m.Credit?.value),
      });
    }
  }
  return out;
}

/** A credit line for the rights holder: Commons' artist, else its credit line,
 *  else our own label — never a template's "Unknown author". */
function attributionFor(info: CommonsAudio, pick: SoundtrackPick): string {
  const usable = (s?: string) =>
    s && !/unknown author|^own work$|^self$/i.test(s) ? s.slice(0, 160) : undefined;
  return usable(info.artist) ?? usable(info.credit) ?? pick.creator ?? "Wikimedia Commons";
}

const slug = (s: string) =>
  s
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);

async function exists(path: string): Promise<boolean> {
  try {
    return (await stat(path)).size > 0;
  } catch {
    return false;
  }
}

/** Download one pick (or reuse it) and describe it as a MusicTrack. */
async function fetchTrack(
  pick: SoundtrackPick,
  info: CommonsAudio | undefined,
  name: string,
): Promise<MusicTrack | null> {
  if (!info) {
    console.warn(`    ✗ not on Commons: ${pick.file}`);
    return null;
  }
  if (!COMMONS_OK.test(info.license)) {
    console.warn(`    ✗ license not open (${info.license || "none"}): ${pick.file}`);
    return null;
  }
  const dest = join(MUSIC_DIR, name);
  if (!(await exists(dest))) {
    // MP3 plays everywhere; prefer an MP3 original, else the MP3 transcode.
    const url = info.mime === "audio/mpeg" ? info.originalUrl : info.mp3Url;
    try {
      if (!url) throw new Error("no MP3 transcode listed");
      await commonsDownload(url, dest);
    } catch (e) {
      console.warn(`    ✗ no MP3 available (${(e as Error).message}): ${pick.file}`);
      return null;
    }
  }
  const license = normalizeLicense(info.license) as License;
  console.log(`    ✓ ${pick.title} [${info.license}]`);
  return {
    id: name.replace(/\.mp3$/, ""),
    url: `${MUSIC_URL}/${name}`,
    title: pick.title,
    creator: pick.creator,
    date: pick.date,
    volume: pick.volume ?? DEFAULT_VOLUME,
    source: {
      provider: "Wikimedia Commons",
      providerUrl:
        info.pageUrl || `https://commons.wikimedia.org/wiki/${encodeURIComponent(pick.file)}`,
      license,
      attributionText: attributionFor(info, pick),
    },
  };
}

async function fetchPlaylist(
  key: string,
  picks: SoundtrackPick[],
  info: Map<string, CommonsAudio>,
  keep: Set<string>,
): Promise<MusicTrack[]> {
  const out: MusicTrack[] = [];
  for (const [i, pick] of picks.entries()) {
    const name = `${slug(key)}-${i + 1}-${slug(pick.title)}.mp3`;
    keep.add(name);
    const track = await fetchTrack(pick, info.get(pick.file), name);
    if (track) out.push(track);
  }
  return out;
}

/** Fetch the whole soundtrack and write music.json. Returns the track count. */
export async function fetchMusic(): Promise<number> {
  await mkdir(MUSIC_DIR, { recursive: true });
  const cultures = Object.keys(CULTURE_PLAYLISTS) as CultureId[];
  const allPicks = [HOUSE_PLAYLIST, ...cultures.map((c) => CULTURE_PLAYLISTS[c].tracks)].flat();
  console.log(`Checking ${allPicks.length} soundtrack files on Wikimedia Commons…`);
  const info = await lookup([...new Set(allPicks.map((p) => p.file))]);

  const keep = new Set<string>();
  console.log("  House music");
  const house = await fetchPlaylist("house", HOUSE_PLAYLIST, info, keep);
  const byCulture: MusicManifest["cultures"] = {};
  for (const c of cultures) {
    console.log(`  ${c}`);
    byCulture[c] = await fetchPlaylist(c, CULTURE_PLAYLISTS[c].tracks, info, keep);
  }

  // Drop files from picks that have since been removed or renamed.
  for (const f of await readdir(MUSIC_DIR)) {
    if (!keep.has(f)) await rm(join(MUSIC_DIR, f), { force: true });
  }

  const manifest: MusicManifest = {
    generatedAt: new Date().toISOString(),
    house,
    cultures: byCulture,
  };
  await writeFile(MANIFEST, JSON.stringify(manifest, null, 2));
  const n = house.length + Object.values(byCulture).reduce((s, t) => s + (t?.length ?? 0), 0);
  console.log(`Soundtrack: ${n} of ${allPicks.length} tracks → ${MANIFEST}`);
  return n;
}

// Run directly: `npm run fetch:music`.
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  fetchMusic().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
