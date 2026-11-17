import { describe, expect, it } from "vitest";
import { FLOORS } from "../config/layout";
import { deriveMuseum, roomsById } from "../model/deriveMuseum";
import { placeholderContent } from "../data/placeholder";
import { CULTURE_PLAYLISTS, HOUSE_PLAYLIST } from "../data/soundtrack";
import type { CultureId, MusicTrack } from "../model/types";
import { applySoundtrack } from "./soundtrack";
import type { MusicManifest } from "./types";

const track = (id: string, extra: Partial<MusicTrack> = {}): MusicTrack => ({
  id,
  url: `/content/music/${id}.mp3`,
  title: id,
  volume: 0.6,
  source: { provider: "Wikimedia Commons", providerUrl: "#", license: "CC0" },
  ...extra,
});

const museum = deriveMuseum(FLOORS, placeholderContent);

describe("soundtrack data (§8.7)", () => {
  it("has house music and a playlist for every culture", () => {
    expect(HOUSE_PLAYLIST.length).toBeGreaterThan(3);
    const cultures = FLOORS.flatMap((f) => f.ring) as CultureId[];
    for (const c of cultures) expect(CULTURE_PLAYLISTS[c]?.tracks.length, c).toBeGreaterThan(0);
  });

  it("names real Commons file pages, each picked once, with sane volumes", () => {
    const all = [HOUSE_PLAYLIST, ...Object.values(CULTURE_PLAYLISTS).map((p) => p.tracks)].flat();
    for (const p of all) {
      expect(p.file, p.title).toMatch(/^File:.+\.(ogg|oga|opus|mp3|flac|wav)$/i);
      expect(p.title.trim().length).toBeGreaterThan(0);
      const v = p.volume ?? 0.6;
      expect(v).toBeGreaterThan(0);
      expect(v).toBeLessThanOrEqual(1);
    }
    expect(new Set(all.map((p) => p.file)).size).toBe(all.length);
  });
});

describe("applySoundtrack (§8.7)", () => {
  const manifest: MusicManifest = {
    generatedAt: "t",
    house: [track("aria"), track("prelude")],
    cultures: { egypt: [track("egypt-1")], greece: [] },
  };

  it("gives themed rooms their culture's playlist and the museum its house music", () => {
    const out = applySoundtrack(museum, manifest);
    const rooms = roomsById(out);
    expect(out.houseMusic?.map((t) => t.id)).toEqual(["aria", "prelude"]);
    expect(rooms.get("floor-1:egypt")!.theme.music?.map((t) => t.id)).toEqual(["egypt-1"]);
    // An empty playlist, and atria, fall through to the house music.
    expect(rooms.get("floor-1:greece")!.theme.music).toBeUndefined();
    expect(rooms.get("floor-1:atrium")!.theme.music).toBeUndefined();
  });

  it("drops malformed tracks and leaves the museum alone with no manifest", () => {
    const bad: MusicManifest = {
      generatedAt: "t",
      house: [
        track("ok"),
        track("x", { url: "https://evil.example/x.mp3" }),
        track("v", { volume: 3 }),
      ],
      cultures: { egypt: [{ id: "e" } as MusicTrack] },
    };
    const out = applySoundtrack(museum, bad);
    expect(out.houseMusic?.map((t) => t.id)).toEqual(["ok"]);
    expect(roomsById(out).get("floor-1:egypt")!.theme.music).toBeUndefined();
    expect(applySoundtrack(museum, null)).toBe(museum);
  });
});
