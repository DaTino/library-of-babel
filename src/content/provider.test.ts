import { describe, expect, it } from "vitest";
import { createCachedProvider } from "./provider";
import type { CachedManifest } from "./types";
import type { Artwork, BookRef } from "../model/types";
import { FLOORS } from "../config/layout";

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

const manifest: CachedManifest = {
  generatedAt: "t",
  artByCulture: { egypt: Array.from({ length: 8 }, (_, i) => art(`egypt-${i}`)) },
  books: Array.from({ length: 12 }, (_, i) => book(`b-${i}`)),
};

const floor = FLOORS[0];

describe("createCachedProvider", () => {
  const provider = createCachedProvider(manifest);

  it("builds 3 art walls (painting + artifact + 4 books) and a centerpiece", () => {
    const c = provider.contentFor(floor, "egypt");
    expect(c.artWalls).toHaveLength(3);
    for (const w of c.artWalls) {
      expect(w.painting.source.license).toBeTruthy();
      expect(w.shelfItem.source.provider).toBeTruthy();
      expect(w.shelf).toHaveLength(4);
    }
    expect(c.centerpiece).toBeDefined();
  });

  it("draws shelf books from the global pool (§8.5)", () => {
    const poolIds = new Set(manifest.books.map((b) => b.id));
    for (const w of provider.contentFor(floor, "egypt").artWalls) {
      for (const b of w.shelf) expect(poolIds.has(b.id)).toBe(true);
    }
  });

  it("is deterministic for the same room within a session", () => {
    const a = provider.contentFor(floor, "egypt").artWalls.map((w) => w.painting.id);
    const b = provider.contentFor(floor, "egypt").artWalls.map((w) => w.painting.id);
    expect(a).toEqual(b);
  });

  it("falls back to placeholder art for a culture with no cached pool", () => {
    const c = provider.contentFor(floor, "greece"); // absent from the manifest
    expect(c.artWalls).toHaveLength(3);
    expect(c.artWalls[0].painting.source.license).toBeTruthy();
  });
});
