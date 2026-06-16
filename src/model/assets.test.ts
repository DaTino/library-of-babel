import { describe, expect, it } from "vitest";
import { museum } from "../data/placeholder";
import { roomsById } from "./deriveMuseum";
import { collectRoomAssets } from "./assets";

const room = roomsById(museum).get("floor-1:egypt")!;

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
