import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { FLOORS } from "../config/layout";
import {
  CURATION_LICENSES,
  curationTargets,
  validateCredit,
  type CuratedImage,
  type CuratedMusic,
  type CurationCredit,
  type CurationHallwayTarget,
  type CurationManifest,
  type CurationRoomTarget,
  type CurationSlot,
} from "../content/curation";
import { onCurationChange } from "../content/loadCuration";
import type { CachedManifest, MusicManifest } from "../content/types";
import { CULTURE_PLAYLISTS } from "../data/soundtrack";
import type { Artwork, MusicTrack } from "../model/types";
import {
  ApiError,
  editImage,
  editMusic,
  fetchCuration,
  fetchDownloaded,
  fetchSoundtrack,
  pinImage,
  ping,
  removeMusic,
  setMusic,
  unpinImage,
  type Target,
} from "./api";
import { FULL_PX, THUMB_PX, readAudio, resizeImage, titleFromFile } from "./files";

/**
 * The curation admin (§8.6): pick a room or hallway, see each of its spots,
 * and pin your own image to any of them — or leave it to the download. Rooms
 * (and atria) can also have their own music. Saves go straight to
 * public/curation/ via the dev server, and an open museum tab updates live.
 */
export function AdminApp() {
  const targets = useMemo(() => curationTargets(FLOORS), []);
  const [curation, setCuration] = useState<CurationManifest | null>(null);
  const [downloaded, setDownloaded] = useState<CachedManifest | null>(null);
  const [soundtrack, setSoundtrack] = useState<MusicManifest | null>(null);
  const [apiOk, setApiOk] = useState<boolean | null>(null);
  const [selected, setSelected] = useState<string>(() =>
    decodeURIComponent(location.hash.slice(1)),
  );

  const refresh = useCallback(() => fetchCuration().then(setCuration), []);
  useEffect(() => {
    void refresh();
    void fetchDownloaded().then(setDownloaded);
    void fetchSoundtrack().then(setSoundtrack);
    void ping().then(setApiOk);
    return onCurationChange(() => void refresh());
  }, [refresh]);

  const mainRef = useRef<HTMLElement>(null);
  const choose = (id: string) => {
    setSelected(id);
    history.replaceState(null, "", `#${encodeURIComponent(id)}`);
    // Side-by-side: back to the top. Stacked (narrow screens): down to the panel.
    if (window.matchMedia("(max-width: 600px)").matches) {
      requestAnimationFrame(() => mainRef.current?.scrollIntoView({ behavior: "smooth" }));
    } else window.scrollTo({ top: 0 });
  };

  const room = targets.rooms.find((r) => r.id === selected);
  const hallway = targets.hallways.find((h) => h.id === selected);

  return (
    <div className="admin">
      <header className="admin__bar">
        <h1>
          Library of Babel <span>· Curation</span>
        </h1>
        <a href="/" target="_blank" rel="noreferrer">
          Open the museum ↗
        </a>
      </header>
      {apiOk === false && (
        <p className="admin__warn">
          The save API isn't available. Run <code>npm run admin</code> (or <code>npm run dev</code>)
          and open this page from that server.
        </p>
      )}
      <div className="admin__body">
        <Sidebar targets={targets} curation={curation} selected={selected} onChoose={choose} />
        <main className="admin__main" ref={mainRef}>
          {!curation ? (
            <p className="admin__muted">Loading…</p>
          ) : room ? (
            <RoomPanel
              key={room.id}
              target={room}
              curation={curation}
              downloaded={downloaded}
              soundtrack={soundtrack}
              onSaved={refresh}
            />
          ) : hallway ? (
            <HallwayPanel
              key={hallway.id}
              target={hallway}
              curation={curation}
              downloaded={downloaded}
              onSaved={refresh}
            />
          ) : (
            <Welcome />
          )}
        </main>
      </div>
    </div>
  );
}

function Welcome() {
  return (
    <section className="admin__welcome">
      <h2>Curate the museum</h2>
      <p>
        Pick a room or hallway on the left. Each one lists its exhibit spots — the paintings, the
        artifacts on the bookshelves and the centrepiece in a room; the plates and display cases in
        a hallway. Pin your own image to any spot and it shows there on every visit; leave a spot
        empty and it keeps showing a random pick from the downloaded collection.
      </p>
      <p>
        Every image needs a title, a license and a source — they appear on its label and in the
        museum's Sources panel. Rooms (and each floor's atrium) can also have their own music, which
        replaces the downloaded soundtrack there.
      </p>
      <p className="admin__muted">
        Your files are saved in <code>public/curation/</code> — commit them to keep them. Books
        aren't curated here.
      </p>
    </section>
  );
}

// --- Sidebar ---------------------------------------------------------------------

function pinnedCount(c: CurationManifest | null, section: "rooms" | "hallways", id: string) {
  return Object.keys(c?.[section][id]?.slots ?? {}).length;
}

function Sidebar({
  targets,
  curation,
  selected,
  onChoose,
}: {
  targets: ReturnType<typeof curationTargets>;
  curation: CurationManifest | null;
  selected: string;
  onChoose: (id: string) => void;
}) {
  return (
    <nav className="admin__nav">
      {FLOORS.map((f) => (
        <div key={f.id} className="admin__floor">
          <h2>{f.title}</h2>
          <h3>Rooms</h3>
          <ul>
            {targets.rooms
              .filter((r) => r.floorId === f.id)
              .map((r) => {
                const n = pinnedCount(curation, "rooms", r.id);
                const music = !!curation?.rooms[r.id]?.music;
                return (
                  <li key={r.id}>
                    <button
                      className={selected === r.id ? "is-active" : ""}
                      onClick={() => onChoose(r.id)}
                      aria-label={`${r.title}${n ? `, ${n} pinned` : ""}${music ? ", has music" : ""}`}
                    >
                      <span>{r.kind === "atrium" ? "The Atrium" : r.title}</span>
                      <span className="admin__badges">
                        {n > 0 && <em>{n}</em>}
                        {music && <em title="Has its own music">♪</em>}
                      </span>
                    </button>
                  </li>
                );
              })}
          </ul>
          <h3>Hallways</h3>
          <ul>
            {targets.hallways
              .filter((h) => h.floorId === f.id)
              .map((h) => {
                const n = pinnedCount(curation, "hallways", h.id);
                return (
                  <li key={h.id}>
                    <button
                      className={selected === h.id ? "is-active" : ""}
                      onClick={() => onChoose(h.id)}
                      title={`${h.between[0]} ↔ ${h.between[1]}`}
                      aria-label={`${h.title} hallway, ${h.between[0]} to ${h.between[1]}${n ? `, ${n} pinned` : ""}`}
                    >
                      <span>{h.title}</span>
                      <span className="admin__badges">{n > 0 && <em>{n}</em>}</span>
                    </button>
                  </li>
                );
              })}
          </ul>
        </div>
      ))}
    </nav>
  );
}

// --- Panels ----------------------------------------------------------------------

function RoomPanel({
  target,
  curation,
  downloaded,
  soundtrack,
  onSaved,
}: {
  target: CurationRoomTarget;
  curation: CurationManifest;
  downloaded: CachedManifest | null;
  soundtrack: MusicManifest | null;
  onSaved: () => void;
}) {
  const entry = curation.rooms[target.id];
  const pool = target.culture ? (downloaded?.artByCulture[target.culture] ?? []) : [];
  // What plays here without curated music (§8.7): the culture's playlist, else
  // the house music (atria, and any room whose playlist didn't download).
  const own = target.culture ? (soundtrack?.cultures[target.culture] ?? []) : [];
  const fallback: DefaultMusic = own.length
    ? { kind: "room", tracks: own, note: CULTURE_PLAYLISTS[target.culture!]?.note }
    : soundtrack?.house.length
      ? { kind: "house", tracks: soundtrack.house }
      : { kind: "generated", tracks: [] };
  return (
    <section>
      <p className="admin__eyebrow">{target.floorTitle}</p>
      <h2 className="admin__title">{target.title}</h2>
      {target.slots.length > 0 ? (
        <>
          <h3 className="admin__section">Exhibits</h3>
          <div className="admin__grid">
            {target.slots.map((s) => (
              <SlotCard
                key={s.id}
                target={{ kind: "room", id: target.id, slot: s.id }}
                slot={s}
                pinned={entry?.slots?.[s.id]}
                pool={pool}
                onSaved={onSaved}
              />
            ))}
          </div>
        </>
      ) : (
        <p className="admin__muted">
          The atrium has no exhibit spots of its own — its six hallways are listed separately. You
          can give it music below.
        </p>
      )}
      <h3 className="admin__section">Music</h3>
      <MusicCard roomId={target.id} music={entry?.music} fallback={fallback} onSaved={onSaved} />
    </section>
  );
}

function HallwayPanel({
  target,
  curation,
  downloaded,
  onSaved,
}: {
  target: CurationHallwayTarget;
  curation: CurationManifest;
  downloaded: CachedManifest | null;
  onSaved: () => void;
}) {
  const entry = curation.hallways[target.id];
  const pools = downloaded?.exhibitsByCategory?.[target.category];
  return (
    <section>
      <p className="admin__eyebrow">
        {target.floorTitle} · hallway between {target.between[0]} and {target.between[1]}
      </p>
      <h2 className="admin__title">
        {target.title} <span className="admin__muted">· {target.subtitle}</span>
      </h2>
      <h3 className="admin__section">Exhibits</h3>
      <div className="admin__grid">
        {target.slots.map((s) => (
          <SlotCard
            key={s.id}
            target={{ kind: "hallway", id: target.id, slot: s.id }}
            slot={s}
            pinned={entry?.slots?.[s.id]}
            pool={(s.kind === "case" ? pools?.specimens : pools?.plates) ?? []}
            onSaved={onSaved}
          />
        ))}
      </div>
      <p className="admin__muted">
        Hallways don't have music of their own — they blend the music of the two rooms they join.
      </p>
    </section>
  );
}

// --- Spot card -------------------------------------------------------------------

const blankCredit = (title = ""): CurationCredit => ({
  title,
  license: "" as CurationCredit["license"],
  sourceName: "",
});

const creditOf = (x: CurationCredit): CurationCredit => ({
  title: x.title,
  creator: x.creator,
  date: x.date,
  license: x.license,
  rightsNote: x.rightsNote,
  sourceName: x.sourceName,
  sourceUrl: x.sourceUrl,
  attribution: x.attribution,
});

function SlotCard({
  target,
  slot,
  pinned,
  pool,
  onSaved,
}: {
  target: Target;
  slot: CurationSlot;
  pinned: CuratedImage | undefined;
  pool: Artwork[];
  onSaved: () => void;
}) {
  const fileInput = useRef<HTMLInputElement>(null);
  const [draft, setDraft] = useState<{
    file?: File;
    preview?: string;
    credit: CurationCredit;
  } | null>(null);
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);

  // Free the local preview once it's replaced or the draft is closed (not on
  // every keystroke in the form — the draft object changes then, its preview doesn't).
  const preview = draft?.preview;
  useEffect(
    () => () => {
      if (preview) URL.revokeObjectURL(preview);
    },
    [preview],
  );

  const pick = (file: File | undefined) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setErrors(["Please choose an image file (JPEG, PNG or WebP)."]);
      return;
    }
    setErrors([]);
    setDraft({
      file,
      preview: URL.createObjectURL(file),
      credit: pinned ? creditOf(pinned) : blankCredit(titleFromFile(file.name)),
    });
  };

  const save = async () => {
    if (!draft) return;
    const problems = validateCredit(draft.credit);
    if (problems.length) return setErrors(problems);
    setBusy(true);
    setErrors([]);
    try {
      if (draft.file) {
        const [full, thumb] = await Promise.all([
          resizeImage(draft.file, FULL_PX),
          resizeImage(draft.file, THUMB_PX),
        ]);
        await pinImage(target, draft.credit, full, thumb);
      } else {
        await editImage(target, draft.credit);
      }
      setDraft(null);
      onSaved();
    } catch (e) {
      setErrors(e instanceof ApiError ? [e.message, ...e.details] : [String(e)]);
    } finally {
      setBusy(false);
    }
  };

  const unpin = async () => {
    if (!confirm(`Remove your image from “${slot.label}”? It will go back to the downloaded pick.`))
      return;
    setBusy(true);
    try {
      await unpinImage(target);
      onSaved();
    } catch (e) {
      setErrors(e instanceof ApiError ? [e.message] : [String(e)]);
    } finally {
      setBusy(false);
    }
  };

  return (
    <article className={`admin__card${pinned ? " is-pinned" : ""}`}>
      <header>
        <h4>{slot.label}</h4>
        <p>{slot.where}</p>
      </header>

      {draft ? (
        <div className="admin__draft">
          <div className="admin__preview">
            <img src={draft.preview ?? `/curation/${pinned?.thumb}`} alt="" />
          </div>
          <CreditForm
            value={draft.credit}
            onChange={(credit) => setDraft({ ...draft, credit })}
            disabled={busy}
          />
          <Errors errors={errors} />
          <div className="admin__actions">
            <button className="is-primary" onClick={save} disabled={busy}>
              {busy ? "Saving…" : draft.file ? "Pin this image" : "Save details"}
            </button>
            <button onClick={() => (setDraft(null), setErrors([]))} disabled={busy}>
              Cancel
            </button>
          </div>
        </div>
      ) : pinned ? (
        <>
          <div className="admin__preview">
            <img src={`/curation/${pinned.thumb}`} alt={pinned.title} />
          </div>
          <p className="admin__credit">
            <b>{pinned.title}</b>
            {[pinned.creator, pinned.date].filter(Boolean).length > 0 && (
              <> — {[pinned.creator, pinned.date].filter(Boolean).join(", ")}</>
            )}
            <br />
            <span>
              {pinned.sourceName} · {licenseLabel(pinned.license)}
            </span>
          </p>
          <Errors errors={errors} />
          <div className="admin__actions">
            <button onClick={() => fileInput.current?.click()} disabled={busy}>
              Replace image…
            </button>
            <button onClick={() => setDraft({ credit: creditOf(pinned) })} disabled={busy}>
              Edit details
            </button>
            <button className="is-danger" onClick={unpin} disabled={busy}>
              Remove
            </button>
          </div>
        </>
      ) : (
        <>
          <PoolStrip pool={pool} />
          <Errors errors={errors} />
          <div className="admin__actions">
            <button className="is-primary" onClick={() => fileInput.current?.click()}>
              Choose an image…
            </button>
          </div>
        </>
      )}
      <input
        ref={fileInput}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        hidden
        onChange={(e) => {
          pick(e.target.files?.[0]);
          e.target.value = "";
        }}
      />
    </article>
  );
}

function PoolStrip({ pool }: { pool: Artwork[] }) {
  if (!pool.length) {
    return (
      <p className="admin__pool-empty">
        Uses the download — nothing downloaded for this spot yet, so the museum shows a placeholder.
      </p>
    );
  }
  return (
    <div className="admin__pool">
      <p>Uses the download — one of these, picked at random each visit:</p>
      <div>
        {pool.slice(0, 12).map((a) => (
          <img key={a.id} src={a.thumbUrl} alt={a.title} title={a.title} loading="lazy" />
        ))}
      </div>
    </div>
  );
}

// --- Music -----------------------------------------------------------------------

/** What a room plays when it has no curated music (§6.6, §8.7). */
interface DefaultMusic {
  kind: "room" | "house" | "generated";
  tracks: MusicTrack[];
  note?: string;
}

function DefaultMusicList({ fallback, replaced }: { fallback: DefaultMusic; replaced: boolean }) {
  if (fallback.kind === "generated") {
    return (
      <p className="admin__muted">
        {replaced ? "Replaces" : "Playing"} its generated chords (no soundtrack downloaded — run{" "}
        <code>npm run fetch:music</code>).
      </p>
    );
  }
  return (
    <div className="admin__soundtrack">
      <p className="admin__muted">
        {replaced ? "Replaces " : "Playing "}
        {fallback.kind === "room"
          ? "its downloaded soundtrack, in order and looped:"
          : "the house music (also heard in the hallways and on the stair):"}
      </p>
      {fallback.note && <p className="admin__note">{fallback.note}</p>}
      {!replaced && (
        <ol>
          {fallback.tracks.map((t) => (
            <li key={t.id}>
              <span>
                <b>{t.title}</b>
                {t.creator && <> — {t.creator}</>}
                {t.date && <> ({t.date})</>} ·{" "}
                <a href={t.source.providerUrl} target="_blank" rel="noreferrer">
                  {t.source.license}
                </a>
              </span>
              <audio controls src={t.url} preload="none" />
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

function MusicCard({
  roomId,
  music,
  fallback,
  onSaved,
}: {
  roomId: string;
  music: CuratedMusic | undefined;
  fallback: DefaultMusic;
  onSaved: () => void;
}) {
  const fileInput = useRef<HTMLInputElement>(null);
  const [draft, setDraft] = useState<{
    file?: File;
    credit: CurationCredit;
    volume: number;
  } | null>(null);
  const [volume, setVolume] = useState(music?.volume ?? 0.6);
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);

  useEffect(() => setVolume(music?.volume ?? 0.6), [music?.volume]);

  const fail = (e: unknown) =>
    setErrors(
      e instanceof ApiError ? [e.message, ...e.details] : [String((e as Error)?.message ?? e)],
    );

  const save = async () => {
    if (!draft) return;
    const problems = validateCredit(draft.credit);
    if (problems.length) return setErrors(problems);
    setBusy(true);
    setErrors([]);
    try {
      if (draft.file)
        await setMusic(roomId, draft.credit, await readAudio(draft.file), draft.volume);
      else await editMusic(roomId, { credit: draft.credit });
      setDraft(null);
      onSaved();
    } catch (e) {
      fail(e);
    } finally {
      setBusy(false);
    }
  };

  const commitVolume = async (v: number) => {
    if (!music || v === music.volume) return;
    try {
      await editMusic(roomId, { volume: v });
      onSaved();
    } catch (e) {
      fail(e);
    }
  };

  const remove = async () => {
    const back =
      fallback.kind === "room"
        ? "its downloaded soundtrack"
        : fallback.kind === "house"
          ? "the house music"
          : "its generated chords";
    if (!confirm(`Remove this room's music? It will go back to ${back}.`)) return;
    setBusy(true);
    try {
      await removeMusic(roomId);
      onSaved();
    } catch (e) {
      fail(e);
    } finally {
      setBusy(false);
    }
  };

  return (
    <article className={`admin__card admin__card--wide${music ? " is-pinned" : ""}`}>
      {draft ? (
        <div className="admin__draft">
          {draft.file && <p className="admin__muted">File: {draft.file.name}</p>}
          <CreditForm
            value={draft.credit}
            onChange={(credit) => setDraft({ ...draft, credit })}
            disabled={busy}
          />
          <Errors errors={errors} />
          <div className="admin__actions">
            <button className="is-primary" onClick={save} disabled={busy}>
              {busy ? "Saving…" : draft.file ? "Use this music" : "Save details"}
            </button>
            <button onClick={() => (setDraft(null), setErrors([]))} disabled={busy}>
              Cancel
            </button>
          </div>
        </div>
      ) : music ? (
        <>
          <p className="admin__credit">
            <b>{music.title}</b>
            {music.creator && <> — {music.creator}</>}
            <br />
            <span>
              {music.sourceName} · {licenseLabel(music.license)}
            </span>
          </p>
          <audio controls src={`/curation/${music.file}`} preload="none" />
          <label className="admin__volume">
            Volume
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={volume}
              onChange={(e) => setVolume(Number(e.target.value))}
              onPointerUp={() => void commitVolume(volume)}
              onKeyUp={() => void commitVolume(volume)}
            />
            <span>{Math.round(volume * 100)}%</span>
          </label>
          <DefaultMusicList fallback={fallback} replaced />
          <Errors errors={errors} />
          <div className="admin__actions">
            <button onClick={() => fileInput.current?.click()} disabled={busy}>
              Replace music…
            </button>
            <button
              onClick={() => setDraft({ credit: creditOf(music), volume: music.volume })}
              disabled={busy}
            >
              Edit details
            </button>
            <button className="is-danger" onClick={remove} disabled={busy}>
              Remove
            </button>
          </div>
        </>
      ) : (
        <>
          <DefaultMusicList fallback={fallback} replaced={false} />
          <p className="admin__muted">
            Add your own track to play here instead — it loops, and the hallways blend into it as
            you walk in.
          </p>
          <Errors errors={errors} />
          <div className="admin__actions">
            <button className="is-primary" onClick={() => fileInput.current?.click()}>
              Choose an audio file…
            </button>
          </div>
        </>
      )}
      <input
        ref={fileInput}
        type="file"
        accept="audio/*"
        hidden
        onChange={(e) => {
          const file = e.target.files?.[0];
          e.target.value = "";
          if (!file) return;
          setErrors([]);
          setDraft({
            file,
            credit: music ? creditOf(music) : blankCredit(titleFromFile(file.name)),
            volume: music?.volume ?? 0.6,
          });
        }}
      />
    </article>
  );
}

// --- Shared bits -------------------------------------------------------------------

const licenseLabel = (l: string) => CURATION_LICENSES.find((x) => x.value === l)?.label ?? l;

function CreditForm({
  value,
  onChange,
  disabled,
}: {
  value: CurationCredit;
  onChange: (c: CurationCredit) => void;
  disabled?: boolean;
}) {
  const set = (patch: Partial<CurationCredit>) => onChange({ ...value, ...patch });
  return (
    <fieldset className="admin__form" disabled={disabled}>
      <label>
        Title <i>required</i>
        <input value={value.title} onChange={(e) => set({ title: e.target.value })} />
      </label>
      <div className="admin__row">
        <label>
          Creator
          <input
            value={value.creator ?? ""}
            onChange={(e) => set({ creator: e.target.value })}
            placeholder="Artist, maker, or scientific name"
          />
        </label>
        <label>
          Date
          <input
            value={value.date ?? ""}
            onChange={(e) => set({ date: e.target.value })}
            placeholder="e.g. c. 1840"
          />
        </label>
      </div>
      <label>
        License <i>required</i>
        <select
          value={value.license}
          onChange={(e) => set({ license: e.target.value as CurationCredit["license"] })}
        >
          <option value="" disabled>
            Choose…
          </option>
          {CURATION_LICENSES.map((l) => (
            <option key={l.value} value={l.value}>
              {l.label}
            </option>
          ))}
        </select>
      </label>
      {value.license === "other" && (
        <label>
          Rights <i>required</i>
          <input
            value={value.rightsNote ?? ""}
            onChange={(e) => set({ rightsNote: e.target.value })}
            placeholder="e.g. Own photograph — personal use"
          />
        </label>
      )}
      <div className="admin__row">
        <label>
          Source <i>required</i>
          <input
            value={value.sourceName}
            onChange={(e) => set({ sourceName: e.target.value })}
            placeholder="e.g. The Met, Wikimedia Commons, Own collection"
          />
        </label>
        <label>
          Source link
          <input
            value={value.sourceUrl ?? ""}
            onChange={(e) => set({ sourceUrl: e.target.value })}
            placeholder="https://…"
          />
        </label>
      </div>
      <label>
        Credit line
        <input
          value={value.attribution ?? ""}
          onChange={(e) => set({ attribution: e.target.value })}
          placeholder="Shown with the image, if the license asks for one"
        />
      </label>
    </fieldset>
  );
}

function Errors({ errors }: { errors: string[] }) {
  if (!errors.length) return null;
  return (
    <ul className="admin__errors">
      {errors.map((e, i) => (
        <li key={i}>{e}</li>
      ))}
    </ul>
  );
}
