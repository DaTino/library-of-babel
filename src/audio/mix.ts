import type { MusicTrack, Room } from "../model/types";
import type { MixEntry } from "./AudioEngine";
import { profileForRoom } from "./profiles";

/** The house playlist's key — one voice, shared by every place that plays it,
 *  so it carries on unbroken from hallway to atrium to stair (§6.6). */
export const HOUSE_KEY = "house";

const bedKey = (room: Room) => (room.kind === "atrium" ? "atrium" : (room.culture ?? room.id));

/** A room's sound: its own playlist (soundtrack or curated, §8.6–8.7), else the
 *  house music, else its generated bed. */
export function soundOf(room: Room, house: MusicTrack[] | undefined, weight: number): MixEntry {
  const own = room.theme.music;
  // Keyed by its tracks, so replacing a room's music starts the new one cleanly.
  if (own?.length)
    return { key: `music:${own.map((t) => t.url).join("|")}`, weight, playlist: own };
  if (house?.length) return { key: HOUSE_KEY, weight, playlist: house };
  return { key: bedKey(room), weight, profile: profileForRoom(room.kind, room.culture) };
}

/** Entries that share a voice (e.g. two rooms both on house music) combine by
 *  power, so an equal-power crossfade between them stays at full level. */
export function combine(entries: MixEntry[]): MixEntry[] {
  const out = new Map<string, MixEntry>();
  for (const e of entries) {
    const prev = out.get(e.key);
    out.set(e.key, prev ? { ...prev, weight: Math.hypot(prev.weight, e.weight) } : e);
  }
  return [...out.values()];
}

/**
 * What to hear (§6.6): in a room, its sound. Walking a hallway (§2.7) — `t` from
 * 0 at this room's door to 1 at the far room's — with house music, the room
 * fades into it by the bend and the bend hands over to the room ahead; without
 * house music, the two rooms crossfade directly. Equal-power throughout, and
 * symmetric in t, so the hand-over at the bend (t → 1 − t) is seamless.
 */
export function mixFor(
  room: Room,
  other: Room | undefined,
  t: number | null,
  house: MusicTrack[] | undefined,
): MixEntry[] {
  if (!other || t === null) return [soundOf(room, house, 1)];
  const q = Math.min(1, Math.max(0, t));
  if (!house?.length) {
    const a = (q * Math.PI) / 2;
    return combine([soundOf(room, house, Math.cos(a)), soundOf(other, house, Math.sin(a))]);
  }
  const houseAt = (w: number): MixEntry => ({ key: HOUSE_KEY, weight: w, playlist: house });
  if (q <= 0.5) {
    const a = q * Math.PI; // 0 → π/2 over the first half
    return combine([soundOf(room, house, Math.cos(a)), houseAt(Math.sin(a))]);
  }
  const a = (q - 0.5) * Math.PI;
  return combine([houseAt(Math.cos(a)), soundOf(other, house, Math.sin(a))]);
}
