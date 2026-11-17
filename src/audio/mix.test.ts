import { describe, expect, it } from "vitest";
import { FLOORS } from "../config/layout";
import { deriveMuseum, roomsById } from "../model/deriveMuseum";
import { placeholderContent } from "../data/placeholder";
import type { MusicTrack, Room } from "../model/types";
import { HOUSE_KEY, combine, mixFor, soundOf } from "./mix";

const track = (id: string): MusicTrack => ({
  id,
  url: `/content/music/${id}.mp3`,
  title: id,
  volume: 0.6,
  source: { provider: "Wikimedia Commons", providerUrl: "#", license: "CC0" },
});
const house = [track("aria")];
const rooms = roomsById(deriveMuseum(FLOORS, placeholderContent));
const withMusic = (r: Room, ids: string[]): Room => ({
  ...r,
  theme: { ...r.theme, music: ids.map(track) },
});
const egypt = withMusic(rooms.get("floor-1:egypt")!, ["egypt"]);
const greece = withMusic(rooms.get("floor-1:greece")!, ["greece"]);
const atrium = rooms.get("floor-1:atrium")!;

/** Total power of a mix — equal-power blends keep this at 1. */
const power = (m: { weight: number }[]) => m.reduce((s, e) => s + e.weight ** 2, 0);
const weightOf = (m: { key: string; weight: number }[], key: string) =>
  m.find((e) => e.key === key)?.weight ?? 0;

describe("what each place sounds like (§6.6)", () => {
  it("prefers the room's own playlist, then the house music, then the generated bed", () => {
    expect(soundOf(egypt, house, 1).playlist?.[0].id).toBe("egypt");
    expect(soundOf(atrium, house, 1)).toMatchObject({ key: HOUSE_KEY });
    const bed = soundOf(atrium, undefined, 1);
    expect(bed.playlist).toBeUndefined();
    expect(bed.profile).toBeDefined();
  });

  it("is just the room when not in a hallway", () => {
    expect(mixFor(egypt, greece, null, house)).toHaveLength(1);
  });
});

describe("the hallway blend (§2.7)", () => {
  const roomKey = soundOf(egypt, house, 1).key;
  const otherKey = soundOf(greece, house, 1).key;

  it("goes room → house music at the bend → the room ahead, at constant power", () => {
    expect(weightOf(mixFor(egypt, greece, 0, house), roomKey)).toBeCloseTo(1);
    const bend = mixFor(egypt, greece, 0.5, house);
    expect(weightOf(bend, HOUSE_KEY)).toBeCloseTo(1);
    expect(weightOf(bend, roomKey)).toBeCloseTo(0);
    expect(weightOf(bend, otherKey)).toBeCloseTo(0);
    expect(weightOf(mixFor(egypt, greece, 1, house), otherKey)).toBeCloseTo(1);
    for (let t = 0; t <= 1; t += 0.05)
      expect(power(mixFor(egypt, greece, t, house))).toBeCloseTo(1);
  });

  it("is symmetric, so the hand-over at the bend (t → 1 − t) is seamless", () => {
    for (const t of [0.1, 0.3, 0.45, 0.55, 0.8]) {
      const here = mixFor(egypt, greece, t, house);
      const there = mixFor(greece, egypt, 1 - t, house);
      for (const k of [roomKey, otherKey, HOUSE_KEY])
        expect(weightOf(there, k)).toBeCloseTo(weightOf(here, k));
    }
  });

  it("stays on the house music the whole way between two places that both play it", () => {
    for (const t of [0, 0.25, 0.5, 0.75, 1]) {
      const m = mixFor(atrium, rooms.get("floor-1:greece")!, t, house);
      expect(m).toHaveLength(1);
      expect(m[0].key).toBe(HOUSE_KEY);
      expect(m[0].weight).toBeCloseTo(1);
    }
  });

  it("crossfades the two rooms directly when there's no house music", () => {
    const m = mixFor(egypt, greece, 0.5, undefined);
    expect(weightOf(m, roomKey)).toBeCloseTo(Math.SQRT1_2);
    expect(weightOf(m, otherKey)).toBeCloseTo(Math.SQRT1_2);
  });
});

describe("combine", () => {
  it("merges entries for the same voice by power", () => {
    const m = combine([
      { key: "a", weight: 0.6 },
      { key: "a", weight: 0.8 },
      { key: "b", weight: 0.5 },
    ]);
    expect(m).toHaveLength(2);
    expect(weightOf(m, "a")).toBeCloseTo(1);
    expect(weightOf(m, "b")).toBeCloseTo(0.5);
  });
});
