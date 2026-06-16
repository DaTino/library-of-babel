import { FLOORS } from "../config/layout";
import { deriveMuseum } from "../model/deriveMuseum";
import type { ContentProvider, RoomContent } from "../model/deriveMuseum";
import type { Artwork, BookRef, CultureId, RoomTheme, SourceRef } from "../model/types";

/**
 * Phase 0 placeholder content (§10). Hard-coded lorem + a CC0 stub image so the
 * data model and renderer have something to chew on. Swapped wholesale for the
 * real sourcing layer (§8) in Phase 4 — note it implements the same
 * `ContentProvider` seam, so nothing downstream changes.
 */

const PLACEHOLDER_IMG = "/placeholder-art.svg";

const stubSource = (provider: string): SourceRef => ({
  provider,
  providerUrl: "#",
  license: "CC0",
  rightsNote: "Phase 0 placeholder — replaced by the sourcing layer (§8) in Phase 4.",
});

const LOREM_TITLES = [
  "On the Nature of Hexagons",
  "A Treatise of Imaginary Libraries",
  "The Book of Sand",
  "Catalogue of Forking Paths",
  "Meditations on Marble",
  "The Cartography of Lost Rooms",
  "Field Notes from the Atrium",
  "Concerning Stairs that Climb Forever",
];

// Tiny lorem pool standing in for the global corpus (§8.3 / §8.5).
const LOREM_BOOKS: BookRef[] = LOREM_TITLES.map((title, i) => ({
  id: `placeholder-book-${i + 1}`,
  title,
  author: "Anonymous",
  language: "en",
  source: stubSource("Placeholder Library"),
}));

const placeholderArtwork = (id: string, title: string, culture: CultureId): Artwork => ({
  id,
  title,
  creator: "Unknown",
  culture,
  imageUrl: PLACEHOLDER_IMG,
  thumbUrl: PLACEHOLDER_IMG,
  source: stubSource("Placeholder Collection"),
});

// Per-culture themes (§6.4 / §6.6): a distinct palette + lighting per wing.
const THEMES: Record<CultureId, RoomTheme> = {
  egypt: {
    palette: ["#c2a25a", "#8a6d3b", "#e8d5a0"],
    keyLight: { color: "#ffe8b0", intensity: 1.2 },
    ambientLight: { color: "#caa86a", intensity: 0.5 },
    materials: { floor: "#8a6d3b", wall: "#e8d5a0" },
  },
  mesoamerica: {
    palette: ["#3a5f4a", "#7a6f5d", "#c9b79c"],
    keyLight: { color: "#fff0d0", intensity: 1.0 },
    ambientLight: { color: "#7a8f7a", intensity: 0.45 },
    materials: { floor: "#7a6f5d", wall: "#c9b79c" },
  },
  greece: {
    palette: ["#dfe3e6", "#9fb1bd", "#f5f5f0"],
    keyLight: { color: "#f4f8ff", intensity: 1.3 },
    ambientLight: { color: "#bcd0dd", intensity: 0.55 },
    materials: { floor: "#9fb1bd", wall: "#f5f5f0" },
  },
  china: {
    palette: ["#b8c9c0", "#6b4f3a", "#e7e2d6"],
    keyLight: { color: "#fff4e0", intensity: 1.1 },
    ambientLight: { color: "#9fb3a8", intensity: 0.5 },
    materials: { floor: "#6b4f3a", wall: "#e7e2d6" },
  },
  renaissance_italy: {
    palette: ["#b07a3c", "#5e4326", "#e3c79a"],
    keyLight: { color: "#ffe0a8", intensity: 1.15 },
    ambientLight: { color: "#a8804a", intensity: 0.5 },
    materials: { floor: "#5e4326", wall: "#e3c79a" },
  },
  tudor_england: {
    palette: ["#5a3a2a", "#7a2230", "#d9c7a3"],
    keyLight: { color: "#ffe6c0", intensity: 1.0 },
    ambientLight: { color: "#6e5240", intensity: 0.45 },
    materials: { floor: "#5a3a2a", wall: "#d9c7a3" },
  },
};

const ATRIUM_THEME: RoomTheme = {
  palette: ["#1a1a1f", "#2a2a32", "#c2a25a"],
  keyLight: { color: "#ffffff", intensity: 0.9 },
  ambientLight: { color: "#8a8a96", intensity: 0.6 },
  materials: { floor: "#2a2a32", wall: "#1a1a1f" },
};

export const placeholderContent: ContentProvider = {
  themeFor: (culture) => THEMES[culture],
  atriumTheme: () => ATRIUM_THEME,
  contentFor: (floor, culture): RoomContent => {
    const label = `${culture} · ${floor.id}`;
    return {
      artWalls: [0, 1, 2].map((k) => ({
        painting: placeholderArtwork(
          `${floor.id}:${culture}:painting-${k}`,
          `Painting ${k + 1} — ${label}`,
          culture,
        ),
        shelfItem: placeholderArtwork(
          `${floor.id}:${culture}:artifact-${k}`,
          `Artifact ${k + 1} — ${label}`,
          culture,
        ),
        shelf: sampleBooks(`${floor.id}:${culture}:${k}`, 4),
      })),
      centerpiece: placeholderArtwork(
        `${floor.id}:${culture}:centerpiece`,
        `Centerpiece — ${label}`,
        culture,
      ),
    };
  },
};

// Deterministic, seed-stable sampling stand-in (real seeded sampler is Phase 4, §8.5).
function sampleBooks(seed: string, count: number): BookRef[] {
  const start = Math.abs(hashString(seed)) % LOREM_BOOKS.length;
  return Array.from({ length: count }, (_, i) => LOREM_BOOKS[(start + i) % LOREM_BOOKS.length]);
}

function hashString(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return h;
}

/** The derived museum (graph + placeholder content), ready for the renderer. */
export const museum = deriveMuseum(FLOORS, placeholderContent);
