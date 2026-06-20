import { describe, expect, it } from "vitest";
import { museum } from "../data/placeholder";
import { roomsById } from "./deriveMuseum";
import { collectRoomAssets, floorArtUrls } from "./assets";
import type { Artwork, Museum } from "./types";

const room = roomsById(museum).get("floor-1:egypt")!;

// A two-floor museum with a distinct image URL per floor, so we can assert that
// floorArtUrls keeps one floor and excludes the other.
const art = (id: string): Artwork => ({
  id,
  title: id,
  imageUrl: `/img/${id}.jpg`,
  thumbUrl: `/thumb/${id}.jpg`,
  source: { provider: "x", providerUrl: "#", license: "CC0" },
});
const twoFloor: Museum = {
  floors: [0, 1].map((level) => ({
    id: `floor-${level}`,
    level,
    ring: [],
    rooms: [
      {
        id: `floor-${level}:room`,
        kind: "themed",
        title: "Room",
        artWalls: [
          { wallIndex: 0, painting: art(`p${level}`), shelfItem: art(`s${level}`), shelf: [] },
        ],
        exits: [],
        centerpiece: art(`c${level}`),
        theme: {
          palette: [],
          keyLight: { color: "#fff", intensity: 1 },
          ambientLight: { color: "#fff", intensity: 1 },
          materials: {},
        },
        floorLevel: level,
      },
    ],
  })),
};

describe("collectRoomAssets", () => {
  it("returns every asset with a required SourceRef (§8.4)", () => {
    const assets = collectRoomAssets(room);
    expect(assets.length).toBeGreaterThan(0);
    for (const a of assets) {
      expect(a.source.provider).toBeTruthy();
      expect(a.source.license).toBeTruthy();
    }
  });

  it("de-dupes by kind+id (books are sampled from a shared pool)", () => {
    const assets = collectRoomAssets(room);
    const keys = assets.map((a) => `${a.kind}:${a.id}`);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it("includes the centerpiece plus paintings, artifacts, and books", () => {
    const kinds = new Set(collectRoomAssets(room).map((a) => a.kind));
    expect(kinds).toContain("centerpiece");
    expect(kinds).toContain("painting");
    expect(kinds).toContain("artifact");
    expect(kinds).toContain("book");
  });
});

describe("floorArtUrls (texture budget §12)", () => {
  it("collects both thumb and hi-res URLs for every artwork on the floor", () => {
    const ground = floorArtUrls(museum, 0);
    expect(ground.size).toBeGreaterThan(0);
    for (const r of museum.floors.find((f) => f.level === 0)!.rooms) {
      for (const wall of r.artWalls) {
        expect(ground.has(wall.painting.thumbUrl)).toBe(true);
        expect(ground.has(wall.shelfItem.thumbUrl)).toBe(true);
      }
      if (r.centerpiece) expect(ground.has(r.centerpiece.thumbUrl)).toBe(true);
    }
  });

  it("keeps the requested floor's URLs and excludes other floors'", () => {
    const ground = floorArtUrls(twoFloor, 0);
    // ground floor present (painting + artifact + centerpiece, thumb + hi-res)
    expect(ground).toEqual(
      new Set([
        "/thumb/p0.jpg",
        "/img/p0.jpg",
        "/thumb/s0.jpg",
        "/img/s0.jpg",
        "/thumb/c0.jpg",
        "/img/c0.jpg",
      ]),
    );
    // nothing from floor 1 leaks in
    expect(ground.has("/thumb/p1.jpg")).toBe(false);
    expect(ground.has("/img/c1.jpg")).toBe(false);
  });

  it("returns an empty set for a level that doesn't exist", () => {
    expect(floorArtUrls(twoFloor, 99).size).toBe(0);
  });
});
