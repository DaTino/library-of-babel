import { describe, expect, it } from "vitest";
import type { Artwork } from "../model/types";
import { EXHIBIT_SLOTS } from "../geometry/hallway";
import { EXHIBIT_CATEGORIES, EXHIBIT_CATEGORY_IDS, arrangeExhibits } from "./exhibits";
import { HALLWAY_EXHIBITS } from "../config/hallways";

const art = (id: string): Artwork => ({
  id,
  title: id,
  imageUrl: `/x/${id}-full.jpg`,
  thumbUrl: `/x/${id}.jpg`,
  source: { provider: "p", providerUrl: "#", license: "PD" },
});
const many = (prefix: string, n: number) =>
  Array.from({ length: n }, (_, i) => art(`${prefix}${i}`));

describe("exhibit categories (§9.1)", () => {
  it("has 36 categories, one for every hallway, and the config uses each exactly once", () => {
    expect(EXHIBIT_CATEGORY_IDS).toHaveLength(36);
    const used = Object.values(HALLWAY_EXHIBITS).flatMap((f) => [...f.spokes, ...f.rim]);
    expect(used).toHaveLength(36);
    expect(new Set(used)).toEqual(new Set(EXHIBIT_CATEGORY_IDS));
    for (const id of EXHIBIT_CATEGORY_IDS) expect(EXHIBIT_CATEGORIES[id].title).toBeTruthy();
  });
});

describe("arrangeExhibits", () => {
  it("puts plates on the walls and specimens in the cases", () => {
    const out = arrangeExhibits("h", "coleoptera", many("p", 8), many("s", 3));
    expect(out).toHaveLength(EXHIBIT_SLOTS.length);
    out.forEach((e, i) => {
      expect(e.display).toBe(EXHIBIT_SLOTS[i].display);
      expect(e.id.startsWith(e.display === "case" ? "s" : "p")).toBe(true);
      expect(e.category).toBe("coleoptera");
    });
    expect(new Set(out.map((e) => e.id)).size).toBe(8); // no repeats
  });

  it("lends between pools before ever showing a placeholder", () => {
    const noSpecimens = arrangeExhibits("h", "odonata", many("p", 8), []);
    expect(noSpecimens.every((e) => e.id.startsWith("p"))).toBe(true);
    const fewPlates = arrangeExhibits("h", "odonata", many("p", 2), many("s", 6));
    expect(fewPlates.every((e) => !e.source.rightsNote?.includes("Placeholder"))).toBe(true);
  });

  it("re-hangs real items rather than leaving gaps, and only then uses placeholders", () => {
    const tiny = arrangeExhibits("h", "amber", many("p", 1), []);
    expect(tiny.every((e) => e.id === "p0")).toBe(true);
    const empty = arrangeExhibits("h", "amber", [], []);
    expect(empty).toHaveLength(8);
    expect(empty.every((e) => e.source.rightsNote?.includes("Placeholder"))).toBe(true);
  });
});
