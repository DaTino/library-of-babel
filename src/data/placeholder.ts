import { FLOORS } from "../config/layout";
import { deriveMuseum } from "../model/deriveMuseum";
import type { ContentProvider, RoomContent } from "../model/deriveMuseum";
import type { Artwork, BookRef, CultureId, SourceRef } from "../model/types";
import { ATRIUM_THEME, CULTURE_THEMES } from "./themes";
import { sample } from "../content/seededRandom";

/**
 * Phase 0 placeholder content (§10) + the offline/dev fallback when the Phase 4
 * cache (`public/content/manifest.json`) isn't present. Implements the same
 * `ContentProvider` seam as the cached provider, so nothing downstream changes.
 */

const PLACEHOLDER_IMG = "/placeholder-art.svg";

const stubSource = (provider: string): SourceRef => ({
  provider,
  providerUrl: "#",
  license: "CC0",
  rightsNote: "Placeholder — run `npm run fetch:content` for real, sourced content (§8).",
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

/** Tiny lorem pool standing in for the global corpus (§8.3 / §8.5). */
export const LOREM_BOOKS: BookRef[] = LOREM_TITLES.map((title, i) => ({
  id: `placeholder-book-${i + 1}`,
  title,
  author: "Anonymous",
  language: "en",
  source: stubSource("Placeholder Library"),
}));

export const placeholderArtwork = (id: string, title: string, culture: CultureId): Artwork => ({
  id,
  title,
  creator: "Unknown",
  culture,
  imageUrl: PLACEHOLDER_IMG,
  thumbUrl: PLACEHOLDER_IMG,
  source: stubSource("Placeholder Collection"),
});

export const placeholderContent: ContentProvider = {
  themeFor: (culture) => CULTURE_THEMES[culture],
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
        shelf: sample(LOREM_BOOKS, `${floor.id}:${culture}:${k}`, 4),
      })),
      centerpiece: placeholderArtwork(
        `${floor.id}:${culture}:centerpiece`,
        `Centerpiece — ${label}`,
        culture,
      ),
    };
  },
};

/** The derived placeholder museum (used by tests and as the initial render). */
export const museum = deriveMuseum(FLOORS, placeholderContent);
