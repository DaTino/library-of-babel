import { describe, expect, it } from "vitest";
import { FLOORS } from "../config/layout";
import { deriveMuseum, hallwaysById, roomsById } from "../model/deriveMuseum";
import { placeholderContent } from "../data/placeholder";
import type { Museum, MusicTrack } from "../model/types";
import {
  applyCuration,
  cleanCredit,
  curationTargets,
  emptyCuration,
  fileStem,
  validateCredit,
  type CuratedImage,
  type CurationManifest,
} from "./curation";

const credit = {
  title: "The Great Wave",
  creator: "Hokusai",
  date: "c. 1831",
  license: "PD" as const,
  sourceName: "The Met",
  sourceUrl: "https://www.metmuseum.org/art/collection/search/36491",
};
const image = (name: string): CuratedImage => ({
  ...credit,
  file: `images/${name}.jpg`,
  thumb: `images/${name}-thumb.jpg`,
  updatedAt: "2026-10-24T00:00:00.000Z",
});

const museum = deriveMuseum(FLOORS, placeholderContent);

describe("curation targets (§8.6)", () => {
  const t = curationTargets(FLOORS);

  it("lists every room (7 spots in a themed room, none in an atrium) and every hallway (8)", () => {
    expect(t.rooms).toHaveLength(21);
    expect(t.hallways).toHaveLength(36);
    for (const r of t.rooms) expect(r.slots).toHaveLength(r.kind === "atrium" ? 0 : 7);
    for (const h of t.hallways) {
      expect(h.slots).toHaveLength(8);
      expect(h.slots.filter((s) => s.kind === "case")).toHaveLength(2);
    }
  });

  it("describes where each spot is in terms of the room's doors", () => {
    const egypt = t.rooms.find((r) => r.id === "floor-1:egypt")!;
    expect(egypt.slots.map((s) => s.id)).toEqual([
      "painting-1",
      "artifact-1",
      "painting-2",
      "artifact-2",
      "painting-3",
      "artifact-3",
      "centerpiece",
    ]);
    expect(egypt.slots[0].where).toMatch(/The Atrium/);
  });
});

describe("credit validation (§8.4)", () => {
  it("accepts a complete credit", () => {
    expect(validateCredit(credit)).toEqual([]);
  });

  it("requires a title, a license, and a source — and rights for 'other'", () => {
    expect(validateCredit({ ...credit, title: " " }).length).toBeGreaterThan(0);
    expect(validateCredit({ ...credit, license: "nope" as never }).length).toBeGreaterThan(0);
    expect(validateCredit({ ...credit, sourceName: "" }).length).toBeGreaterThan(0);
    expect(validateCredit({ ...credit, license: "other" }).length).toBeGreaterThan(0);
    expect(validateCredit({ ...credit, license: "other", rightsNote: "Own photo" })).toEqual([]);
    expect(validateCredit({ ...credit, sourceUrl: "javascript:alert(1)" }).length).toBeGreaterThan(
      0,
    );
  });

  it("cleans a credit down to known, trimmed fields", () => {
    const c = cleanCredit({ ...credit, title: "  Wave  ", extra: "x" } as never);
    expect(c.title).toBe("Wave");
    expect("extra" in c).toBe(false);
    expect(c.rightsNote).toBeUndefined(); // only kept for "other"
  });
});

describe("applyCuration (§8.6)", () => {
  it("leaves the museum alone when there's no curation", () => {
    expect(applyCuration(museum, null)).toBe(museum);
    const same = applyCuration(museum, emptyCuration());
    expect(roomsById(same).get("floor-1:egypt")!.artWalls[0].painting).toEqual(
      roomsById(museum).get("floor-1:egypt")!.artWalls[0].painting,
    );
  });

  it("pins images to room spots and leaves the others to the download", () => {
    const c: CurationManifest = {
      ...emptyCuration(),
      rooms: {
        "floor-1:egypt": { slots: { "painting-2": image("a"), centerpiece: image("b") } },
      },
    };
    const before = roomsById(museum).get("floor-1:egypt")!;
    const after = roomsById(applyCuration(museum, c, "/base/")).get("floor-1:egypt")!;
    expect(after.artWalls[1].painting.thumbUrl).toBe("/base/curation/images/a-thumb.jpg");
    expect(after.artWalls[1].painting.imageUrl).toBe("/base/curation/images/a.jpg");
    expect(after.artWalls[1].painting.source.provider).toBe("The Met");
    expect(after.centerpiece?.title).toBe("The Great Wave");
    expect(after.artWalls[0].painting).toEqual(before.artWalls[0].painting);
    expect(after.artWalls[1].shelfItem).toEqual(before.artWalls[1].shelfItem);
  });

  it("pins hallway exhibits, keeping each spot's display type", () => {
    const id = "floor-1:hall:atrium~egypt";
    const c: CurationManifest = {
      ...emptyCuration(),
      hallways: { [id]: { slots: { "exhibit-3": image("case") } } },
    };
    const h = hallwaysById(applyCuration(museum, c)).get(id)!;
    expect(h.exhibits[2].display).toBe("case");
    expect(h.exhibits[2].title).toBe("The Great Wave");
    expect(h.exhibits[0]).toEqual(hallwaysById(museum).get(id)!.exhibits[0]);
  });

  it("sets curated music as the room's playlist (with its credit)", () => {
    const c: CurationManifest = {
      ...emptyCuration(),
      rooms: {
        "floor-1:atrium": {
          music: { ...credit, file: "music/atrium.mp3", volume: 0.4, updatedAt: "t" },
        },
      },
    };
    const atrium = roomsById(applyCuration(museum, c)).get("floor-1:atrium")!;
    expect(atrium.theme.music).toHaveLength(1);
    const [track] = atrium.theme.music!;
    expect(track.url).toBe("/curation/music/atrium.mp3");
    expect(track.volume).toBe(0.4);
    expect(track.title).toBe("The Great Wave");
    expect(track.source.provider).toBe("The Met");
  });

  it("replaces a room's downloaded playlist and keeps the museum's house music", () => {
    const house: MusicTrack[] = [
      {
        id: "h",
        url: "/content/music/h.mp3",
        title: "Aria",
        volume: 0.6,
        source: { provider: "Wikimedia Commons", providerUrl: "#", license: "CC0" },
      },
    ];
    const withSoundtrack: Museum = {
      ...museum,
      houseMusic: house,
      floors: museum.floors.map((f) => ({
        ...f,
        rooms: f.rooms.map((r) =>
          r.id === "floor-1:egypt"
            ? { ...r, theme: { ...r.theme, music: [...house, ...house] } }
            : r,
        ),
      })),
    };
    const c: CurationManifest = {
      ...emptyCuration(),
      rooms: {
        "floor-1:egypt": { music: { ...credit, file: "music/e.mp3", volume: 0.5, updatedAt: "t" } },
      },
    };
    const out = applyCuration(withSoundtrack, c);
    expect(out.houseMusic).toBe(house);
    expect(
      roomsById(out)
        .get("floor-1:egypt")!
        .theme.music!.map((t) => t.url),
    ).toEqual(["/curation/music/e.mp3"]);
  });

  it("ignores entries that are invalid or point outside the curation folder", () => {
    const c: CurationManifest = {
      ...emptyCuration(),
      rooms: {
        "floor-1:egypt": {
          slots: {
            "painting-1": { ...image("x"), file: "../../secret.jpg" },
            "painting-2": { ...image("y"), license: "" as never },
          },
          music: { ...credit, file: "music/x.exe", volume: 0.5, updatedAt: "t" },
        },
      },
    };
    const before = roomsById(museum).get("floor-1:egypt")!;
    const after = roomsById(applyCuration(museum, c)).get("floor-1:egypt")!;
    expect(after.artWalls[0].painting).toEqual(before.artWalls[0].painting);
    expect(after.artWalls[1].painting).toEqual(before.artWalls[1].painting);
    expect(after.theme.music).toBeUndefined();
  });

  it("makes safe file-name stems", () => {
    expect(fileStem("floor-1:hall:atrium~egypt", "exhibit-3")).toBe(
      "floor-1-hall-atrium-egypt-exhibit-3",
    );
    expect(fileStem("../x/..", "y")).toMatch(/^[a-z0-9-]+$/);
  });
});
