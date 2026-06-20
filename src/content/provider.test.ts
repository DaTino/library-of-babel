import { describe, expect, it } from "vitest";
import { createCachedProvider } from "./provider";
import type { CachedManifest } from "./types";
import type { Artwork, BookRef } from "../model/types";
import { FLOORS } from "../config/layout";
import { deriveMuseum } from "../model/deriveMuseum";

const art = (id: string): Artwork => ({
  id,
  title: id,
  imageUrl: `/img/${id}.jpg`,
  thumbUrl: `/img/${id}.jpg`,
  source: { provider: "The Metropolitan Museum of Art", providerUrl: "#", license: "CC0" },
});

const book = (id: string): BookRef => ({
  id,
  title: id,
  language: "en",
  readUrl: `/t/${id}.txt`,
  source: { provider: "Project Gutenberg", providerUrl: "#", license: "PD" },
});

// Enough books to fill every shelf (54 shelves × 10 = 540) with room to spare.
const manifest: CachedManifest = {
  generatedAt: "t",
  artByCulture: { egypt: Array.from({ length: 8 }, (_, i) => art(`egypt-${i}`)) },
  books: Array.from({ length: 600 }, (_, i) => book(`b-${i}`)),
};

const provider = createCachedProvider(manifest);
const floor = FLOORS[0];

describe("createCachedProvider", () => {
  it("builds 3 art walls (painting + artifact + 10 books) and a centerpiece", () => {
    const c = provider.contentFor(floor, "egypt");
    expect(c.artWalls).toHaveLength(3);
    for (const w of c.artWalls) {
      expect(w.painting.source.license).toBeTruthy();
      expect(w.shelfItem.source.provider).toBeTruthy();
      expect(w.shelf).toHaveLength(10);
    }
    expect(c.centerpiece).toBeDefined();
  });

  it("places each text exactly once across every shelf in the museum (Phase 6)", () => {
    const museum = deriveMuseum(FLOORS, provider);
    const ids: string[] = [];
    for (const f of museum.floors)
      for (const room of f.rooms)
        for (const w of room.artWalls) for (const b of w.shelf) ids.push(b.id);
    expect(ids.length).toBeGreaterThan(0);
    expect(new Set(ids).size).toBe(ids.length); // no repeats within or across rooms
  });

  it("fills every themed shelf with 10 books when the pool is large enough", () => {
    const museum = deriveMuseum(FLOORS, provider);
    for (const f of museum.floors)
      for (const room of f.rooms.filter((r) => r.kind === "themed"))
        for (const w of room.artWalls) expect(w.shelf).toHaveLength(10);
  });

  it("falls back to placeholder art for a culture with no cached pool", () => {
    const c = provider.contentFor(floor, "rome"); // absent from manifest.artByCulture
    expect(c.artWalls).toHaveLength(3);
    expect(c.artWalls[0].painting.source.license).toBeTruthy();
  });
});

describe("createCachedProvider — featured/legible weighting (§8.5, B1)", () => {
  // download_count descending, so b-0 is the most "featured", b-399 the most obscure.
  const popular: CachedManifest = {
    generatedAt: "t",
    artByCulture: {},
    books: Array.from({ length: 600 }, (_, i) => ({ ...book(`b-${i}`), popularity: 600 - i })),
  };
  const top = new Set(
    [...popular.books]
      .sort((a, b) => (b.popularity ?? 0) - (a.popularity ?? 0))
      .slice(0, 180)
      .map((b) => b.id),
  );
  const museum = deriveMuseum(FLOORS, createCachedProvider(popular));
  const shelves = museum.floors.flatMap((f) =>
    f.rooms.filter((r) => r.kind === "themed").flatMap((r) => r.artWalls.map((w) => w.shelf)),
  );

  it("still places every text exactly once (no repeats anywhere)", () => {
    const ids = shelves.flatMap((s) => s.map((b) => b.id));
    expect(ids.length).toBeGreaterThan(0);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("gives every shelf at least one featured title (not all obscure)", () => {
    for (const shelf of shelves) {
      expect(shelf.some((b) => top.has(b.id))).toBe(true);
    }
  });
});
