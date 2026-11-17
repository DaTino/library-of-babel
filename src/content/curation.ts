import type {
  Artwork,
  CultureId,
  Exhibit,
  ExhibitCategoryId,
  Hallway,
  License,
  Museum,
  MusicTrack,
  Room,
  SourceRef,
} from "../model/types";
import type { FloorConfig } from "../config/layout";
import { deriveMuseum, type ContentProvider } from "../model/deriveMuseum";
import { roomDisplayName } from "../model/labels";
import { EXHIBIT_SLOTS } from "../geometry/hallway";
import { ATRIUM_THEME, CULTURE_THEMES } from "../data/themes";

/**
 * Curation (§8.6): images and music the owner chooses by hand, managed in the
 * local admin page (`npm run admin`) and committed under `public/curation/`.
 * Curated images are **pinned to a spot** — a painting, shelf artifact or
 * centrepiece in a room, or one of a hallway's plates/cases — and replace the
 * random downloaded pick there on every visit. Spots left empty keep the
 * download (§8, §9). Curated music replaces a room's playlist (§6.6, §8.7).
 * Books are never curated (§8.5).
 *
 * This module is shared by the app, the admin page, and the admin's dev-server
 * plugin, so all three agree on ids, spots and validation.
 */

export const CURATION_VERSION = 1;

/** Licenses offered by the admin form (§8.4). "other" needs a rights note. */
export const CURATION_LICENSES: { value: License; label: string }[] = [
  { value: "CC0", label: "CC0 (no rights reserved)" },
  { value: "PD", label: "Public domain" },
  { value: "CC-BY", label: "CC BY (attribution)" },
  { value: "CC-BY-SA", label: "CC BY-SA (attribution, share-alike)" },
  { value: "other", label: "Own work / other (describe below)" },
];

/** Credit + license for a curated image or track — required (§8.4). */
export interface CurationCredit {
  title: string;
  creator?: string;
  date?: string;
  license: License;
  /** Required when license is "other" (e.g. "Own photograph — personal use"). */
  rightsNote?: string;
  /** Where it came from — a museum, an archive, "Own collection"… */
  sourceName: string;
  sourceUrl?: string;
  attribution?: string;
}

export interface CuratedImage extends CurationCredit {
  file: string; // "images/<name>.jpg" — viewer size (≤1600 px)
  thumb: string; // "images/<name>-thumb.jpg" — wall size (≤512 px)
  updatedAt: string;
}

export interface CuratedMusic extends CurationCredit {
  file: string; // "music/<name>.mp3"
  /** 0–1, relative to full scale. */
  volume: number;
  updatedAt: string;
}

export interface RoomCuration {
  slots?: Partial<Record<string, CuratedImage>>;
  music?: CuratedMusic;
}

export interface HallwayCuration {
  slots?: Partial<Record<string, CuratedImage>>;
}

export interface CurationManifest {
  version: number;
  rooms: Record<string, RoomCuration>;
  hallways: Record<string, HallwayCuration>;
}

export function emptyCuration(): CurationManifest {
  return { version: CURATION_VERSION, rooms: {}, hallways: {} };
}

// --- Targets: every room/hallway and its spots ---------------------------------

export interface CurationSlot {
  id: string; // "painting-1" | "artifact-2" | "centerpiece" | "exhibit-3"
  label: string; // "Painting 1"
  /** Where it is, in words the owner can find in the museum. */
  where: string;
  kind: "painting" | "artifact" | "centerpiece" | "plate" | "case";
}

export interface CurationRoomTarget {
  id: string;
  floorId: string;
  floorTitle: string;
  title: string;
  kind: "atrium" | "themed";
  culture?: CultureId;
  slots: CurationSlot[]; // empty for atria (music only)
}

export interface CurationHallwayTarget {
  id: string;
  floorId: string;
  floorTitle: string;
  category: ExhibitCategoryId;
  title: string; // "Beetles"
  subtitle: string; // "Coleoptera"
  between: [string, string]; // room display names, ends[0] first
  slots: CurationSlot[];
}

export interface CurationTargets {
  rooms: CurationRoomTarget[];
  hallways: CurationHallwayTarget[];
}

// A content provider with no real content — enough to derive ids and layout.
const structureOnly: ContentProvider = {
  themeFor: (c) => CULTURE_THEMES[c],
  atriumTheme: () => ATRIUM_THEME,
  contentFor: () => ({ artWalls: [] }),
};

/** Art walls sit on walls 0, 2, 4; doors on 1 (atrium), 3 (next), 5 (prev). */
const ART_WALL_NEIGHBOURS: [number, number][] = [
  [5, 1],
  [1, 3],
  [3, 5],
];

function roomSlots(room: Room): CurationSlot[] {
  if (room.kind !== "themed") return [];
  const doorTo = (wall: number) =>
    roomDisplayName(room.exits.find((e) => e.wallIndex === wall)?.toRoomId ?? "");
  const out: CurationSlot[] = [];
  ART_WALL_NEIGHBOURS.forEach(([a, b], k) => {
    const where = `wall between the doors to ${doorTo(a)} and ${doorTo(b)}`;
    out.push({ id: `painting-${k + 1}`, label: `Painting ${k + 1}`, where, kind: "painting" });
    out.push({
      id: `artifact-${k + 1}`,
      label: `Shelf artifact ${k + 1}`,
      where: `in the case on the bookshelf, ${where}`,
      kind: "artifact",
    });
  });
  out.push({
    id: "centerpiece",
    label: "Centrepiece",
    where: "the large case in the middle of the room",
    kind: "centerpiece",
  });
  return out;
}

const HALLWAY_WHERE = [
  (a: string) => `near ${a}, on the left walking out`,
  (a: string) => `near ${a}, on the right walking out`,
  (a: string) => `the display case nearest ${a}`,
  (a: string) => `at the bend, at the end of the ${a} leg`,
  (_a: string, b: string) => `at the bend, at the end of the ${b} leg`,
  (_a: string, b: string) => `near ${b}, on the left walking out`,
  (_a: string, b: string) => `near ${b}, on the right walking out`,
  (_a: string, b: string) => `the display case nearest ${b}`,
];

function hallwaySlots(h: Hallway): CurationSlot[] {
  const a = roomDisplayName(h.ends[0].roomId);
  const b = roomDisplayName(h.ends[1].roomId);
  let plate = 0;
  let kase = 0;
  return EXHIBIT_SLOTS.map((s, i) => ({
    id: `exhibit-${i + 1}`,
    label: s.display === "case" ? `Display case ${++kase}` : `Plate ${++plate}`,
    where: HALLWAY_WHERE[i]?.(a, b) ?? "",
    kind: s.display === "case" ? "case" : "plate",
  }));
}

/** Every curatable room and hallway, with its spots, for the given floors. */
export function curationTargets(floors: readonly FloorConfig[]): CurationTargets {
  const museum = deriveMuseum(floors, structureOnly);
  const rooms: CurationRoomTarget[] = [];
  const hallways: CurationHallwayTarget[] = [];
  for (const f of museum.floors) {
    const floorTitle = f.title ?? f.id;
    for (const r of f.rooms) {
      rooms.push({
        id: r.id,
        floorId: f.id,
        floorTitle,
        title: r.kind === "atrium" ? `The Atrium — ${floorTitle}` : r.title,
        kind: r.kind,
        culture: r.culture,
        slots: roomSlots(r),
      });
    }
    for (const h of f.hallways) {
      hallways.push({
        id: h.id,
        floorId: f.id,
        floorTitle,
        category: h.category,
        title: h.title,
        subtitle: h.subtitle,
        between: [roomDisplayName(h.ends[0].roomId), roomDisplayName(h.ends[1].roomId)],
        slots: hallwaySlots(h),
      });
    }
  }
  return { rooms, hallways };
}

// --- Validation (§8.4) -----------------------------------------------------------

const LICENSES = new Set<string>(CURATION_LICENSES.map((l) => l.value));
const SHORT = 200;
const LONG = 600;

/** Problems with a credit, as human-readable messages (empty = valid). */
export function validateCredit(c: Partial<CurationCredit>): string[] {
  const errors: string[] = [];
  const text = (v: unknown) => (typeof v === "string" ? v.trim() : "");
  if (!text(c.title)) errors.push("A title is required.");
  if (text(c.title).length > SHORT) errors.push("The title is too long.");
  if (!LICENSES.has(String(c.license))) errors.push("Choose a license.");
  if (c.license === "other" && !text(c.rightsNote))
    errors.push("Describe the rights (e.g. “Own photograph — personal use”).");
  if (!text(c.sourceName)) errors.push("Say where it came from (the source).");
  if (c.sourceUrl && !/^https?:\/\/\S+$/i.test(c.sourceUrl.trim()))
    errors.push("The source link must start with http:// or https://.");
  for (const k of ["creator", "date", "attribution", "rightsNote", "sourceName"] as const) {
    if (text(c[k]).length > LONG) errors.push(`The ${k} is too long.`);
  }
  return errors;
}

/** Just the credit fields, trimmed (drops anything else a client sent). */
export function cleanCredit(c: Partial<CurationCredit>): CurationCredit {
  const t = (v: unknown) => (typeof v === "string" && v.trim() ? v.trim() : undefined);
  return {
    title: t(c.title) ?? "",
    creator: t(c.creator),
    date: t(c.date),
    license: (c.license ?? "other") as License,
    rightsNote: c.license === "other" ? t(c.rightsNote) : undefined,
    sourceName: t(c.sourceName) ?? "",
    sourceUrl: t(c.sourceUrl),
    attribution: t(c.attribution),
  };
}

const IMAGE_FILE = /^images\/[a-z0-9-]+\.(jpg|png|webp)$/;
const MUSIC_FILE = /^music\/[a-z0-9-]+\.(mp3|ogg|oga|wav|m4a|webm)$/;

function isCuratedImage(v: unknown): v is CuratedImage {
  const i = v as CuratedImage;
  return (
    !!i &&
    typeof i.file === "string" &&
    IMAGE_FILE.test(i.file) &&
    typeof i.thumb === "string" &&
    IMAGE_FILE.test(i.thumb) &&
    validateCredit(i).length === 0
  );
}

function isCuratedMusic(v: unknown): v is CuratedMusic {
  const m = v as CuratedMusic;
  return (
    !!m &&
    typeof m.file === "string" &&
    MUSIC_FILE.test(m.file) &&
    typeof m.volume === "number" &&
    m.volume >= 0 &&
    m.volume <= 1 &&
    validateCredit(m).length === 0
  );
}

// --- Applying curation to the museum ---------------------------------------------

function sourceOf(c: CurationCredit): SourceRef {
  return {
    provider: c.sourceName,
    providerUrl: c.sourceUrl ?? "#",
    license: c.license,
    attributionText: c.attribution,
    rightsNote: c.rightsNote,
  };
}

function artworkOf(
  img: CuratedImage,
  id: string,
  base: string,
  culture?: Artwork["culture"],
): Artwork {
  return {
    id,
    title: img.title,
    creator: img.creator,
    date: img.date,
    culture,
    imageUrl: `${base}curation/${img.file}`,
    thumbUrl: `${base}curation/${img.thumb}`,
    source: sourceOf(img),
  };
}

function curateRoom(room: Room, c: RoomCuration | undefined, base: string): Room {
  if (!c) return room;
  const slot = (id: string) => {
    const img = c.slots?.[id];
    return isCuratedImage(img)
      ? artworkOf(img, `curated:${room.id}:${id}`, base, room.culture)
      : null;
  };
  const music = isCuratedMusic(c.music) ? c.music : null;
  return {
    ...room,
    artWalls: room.artWalls.map((w, k) => ({
      ...w,
      painting: slot(`painting-${k + 1}`) ?? w.painting,
      shelfItem: slot(`artifact-${k + 1}`) ?? w.shelfItem,
    })),
    centerpiece: (room.centerpiece && slot("centerpiece")) || room.centerpiece,
    // A curated track replaces the room's whole playlist (§6.6).
    theme: music ? { ...room.theme, music: [trackOf(music, room.id, base)] } : room.theme,
  };
}

function trackOf(m: CuratedMusic, roomId: string, base: string): MusicTrack {
  return {
    id: `curated:${roomId}:music`,
    url: `${base}curation/${m.file}`,
    title: m.title,
    creator: m.creator,
    date: m.date,
    volume: m.volume,
    source: sourceOf(m),
  };
}

function curateHallway(h: Hallway, c: HallwayCuration | undefined, base: string): Hallway {
  if (!c?.slots) return h;
  return {
    ...h,
    exhibits: h.exhibits.map((e, i): Exhibit => {
      const img = c.slots?.[`exhibit-${i + 1}`];
      if (!isCuratedImage(img)) return e;
      return {
        ...artworkOf(img, `curated:${h.id}:exhibit-${i + 1}`, base),
        display: e.display,
        category: e.category,
      };
    }),
  };
}

/**
 * Pin the owner's curated images into their spots and set curated room music
 * (§8.6). Anything missing or invalid falls back to the downloaded content.
 */
export function applyCuration(museum: Museum, c: CurationManifest | null, base = "/"): Museum {
  if (!c) return museum;
  return {
    ...museum,
    floors: museum.floors.map((f) => ({
      ...f,
      rooms: f.rooms.map((r) => curateRoom(r, c.rooms?.[r.id], base)),
      hallways: f.hallways.map((h) => curateHallway(h, c.hallways?.[h.id], base)),
    })),
  };
}

/** A safe file-name stem for a target + spot ("floor-1-egypt-painting-1"). */
export function fileStem(targetId: string, slotId: string): string {
  return `${targetId}-${slotId}`
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}
