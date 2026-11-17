import type { Museum, MusicTrack } from "../model/types";
import type { MusicManifest } from "./types";

/**
 * The downloaded soundtrack (§6.6, §8.7): each themed room gets its culture's
 * playlist, and the museum gets its house music (hallways, atria, the stair).
 * Applied before curation (§8.6), so a room's curated music still wins.
 */

const AUDIO_URL = /^\/[\w./-]+\.mp3$/;

function isTrack(t: unknown): t is MusicTrack {
  const m = t as MusicTrack;
  return (
    !!m &&
    typeof m.id === "string" &&
    typeof m.url === "string" &&
    AUDIO_URL.test(m.url) &&
    typeof m.title === "string" &&
    typeof m.volume === "number" &&
    m.volume >= 0 &&
    m.volume <= 1 &&
    !!m.source?.license
  );
}

const valid = (tracks: unknown): MusicTrack[] =>
  Array.isArray(tracks) ? tracks.filter(isTrack) : [];

export function applySoundtrack(museum: Museum, m: MusicManifest | null): Museum {
  if (!m) return museum;
  const house = valid(m.house);
  return {
    ...museum,
    houseMusic: house.length ? house : museum.houseMusic,
    floors: museum.floors.map((f) => ({
      ...f,
      rooms: f.rooms.map((r) => {
        const tracks = r.culture ? valid(m.cultures?.[r.culture]) : [];
        return tracks.length ? { ...r, theme: { ...r.theme, music: tracks } } : r;
      }),
    })),
  };
}
