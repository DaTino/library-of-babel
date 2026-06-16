import { describe, expect, it } from "vitest";
import { deriveMuseum, roomsById } from "./deriveMuseum";
import type { ContentProvider, RoomContent } from "./deriveMuseum";
import type { CultureId, RoomTheme } from "./types";
import type { FloorConfig } from "../config/layout";

const theme: RoomTheme = {
  palette: ["#000"],
  keyLight: { color: "#fff", intensity: 1 },
  ambientLight: { color: "#fff", intensity: 0.5 },
  materials: {},
};

const stubContent: ContentProvider = {
  themeFor: () => theme,
  atriumTheme: () => theme,
  contentFor: (): RoomContent => ({ artWalls: [], centerpiece: undefined }),
};

const ring: CultureId[] = [
  "egypt",
  "mesoamerica",
  "greece",
  "china",
  "renaissance_italy",
  "tudor_england",
];

const floor = (id: string, level: number): FloorConfig => ({ id, level, title: id, ring });

describe("deriveMuseum", () => {
  it("builds one atrium + six themed rooms per floor", () => {
    const m = deriveMuseum([floor("f1", 0)], stubContent);
    expect(m.floors).toHaveLength(1);
    const rooms = m.floors[0].rooms;
    expect(rooms).toHaveLength(7);
    expect(rooms.filter((r) => r.kind === "atrium")).toHaveLength(1);
    expect(rooms.filter((r) => r.kind === "themed")).toHaveLength(6);
  });

  it("gives each themed room exactly 3 doorway exits on alternating walls {1,3,5}", () => {
    const m = deriveMuseum([floor("f1", 0)], stubContent);
    const themed = m.floors[0].rooms.filter((r) => r.kind === "themed");
    for (const room of themed) {
      expect(room.exits).toHaveLength(3);
      expect(room.exits.every((e) => e.kind === "doorway")).toBe(true);
      const walls = room.exits.map((e) => e.wallIndex).sort((a, b) => (a ?? 0) - (b ?? 0));
      expect(walls).toEqual([1, 3, 5]);
    }
  });

  it("gives the atrium six doorway exits, one per themed room (walls 0..5)", () => {
    const m = deriveMuseum([floor("f1", 0)], stubContent);
    const atrium = m.floors[0].rooms.find((r) => r.kind === "atrium")!;
    const doorways = atrium.exits.filter((e) => e.kind === "doorway");
    expect(doorways).toHaveLength(6);
    expect(doorways.map((e) => e.wallIndex).sort((a, b) => (a ?? 0) - (b ?? 0))).toEqual([
      0, 1, 2, 3, 4, 5,
    ]);
  });

  it("has 12 undirected edges per floor (6 spokes + 6 rim = 24 directed)", () => {
    const m = deriveMuseum([floor("f1", 0)], stubContent);
    const directed = m.floors[0].rooms.reduce(
      (sum, r) => sum + r.exits.filter((e) => e.kind === "doorway").length,
      0,
    );
    expect(directed).toBe(24);
  });

  it("places art walls on even indices {0,2,4}", () => {
    const withArt: ContentProvider = {
      ...stubContent,
      contentFor: (): RoomContent => ({
        artWalls: [0, 1, 2].map(() => ({
          painting: art(),
          shelfItem: art(),
          shelf: [],
        })),
      }),
    };
    const m = deriveMuseum([floor("f1", 0)], withArt);
    const themed = m.floors[0].rooms.filter((r) => r.kind === "themed");
    for (const room of themed) {
      expect(room.artWalls.map((w) => w.wallIndex).sort((a, b) => a - b)).toEqual([0, 2, 4]);
    }
  });

  it("every doorway exit targets an existing room", () => {
    const m = deriveMuseum([floor("f1", 0)], stubContent);
    const ids = roomsById(m);
    for (const room of m.floors[0].rooms) {
      for (const exit of room.exits) {
        expect(ids.has(exit.toRoomId)).toBe(true);
      }
    }
  });

  it("wires a finite staircase: ground up-only, top down-only, middle both", () => {
    const m = deriveMuseum([floor("g", 0), floor("mid", 1), floor("top", 2)], stubContent);
    const kindsOf = (floorId: string) =>
      m.floors
        .find((f) => f.id === floorId)!
        .rooms.find((r) => r.kind === "atrium")!
        .exits.map((e) => e.kind);

    expect(kindsOf("g")).toContain("staircase-up");
    expect(kindsOf("g")).not.toContain("staircase-down");
    expect(kindsOf("mid")).toContain("staircase-up");
    expect(kindsOf("mid")).toContain("staircase-down");
    expect(kindsOf("top")).toContain("staircase-down");
    expect(kindsOf("top")).not.toContain("staircase-up");
  });
});

function art() {
  return {
    id: "x",
    title: "x",
    imageUrl: "#",
    thumbUrl: "#",
    source: { provider: "p", providerUrl: "#", license: "CC0" as const },
  };
}
