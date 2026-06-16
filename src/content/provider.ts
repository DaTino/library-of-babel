import type { ContentProvider, RoomContent } from "../model/deriveMuseum";
import type { Artwork, BookRef, CultureId } from "../model/types";
import type { FloorConfig } from "../config/layout";
import { ATRIUM_THEME, CULTURE_THEMES } from "../data/themes";
import { LOREM_BOOKS, placeholderArtwork } from "../data/placeholder";
import { sample } from "./seededRandom";
import type { CachedManifest } from "./types";

// Reshuffle the Library each visit (§5/§8.5): a per-load salt mixed into seeds,
// so selection is stable within a session but varies across visits.
const SESSION_SALT = Math.random().toString(36).slice(2);
const ART_PER_ROOM = 7; // 3 paintings + 3 shelf artifacts + 1 centerpiece
const BOOKS_PER_SHELF = 4;

/**
 * Content provider backed by the Phase 4 cache (§8). Art is picked per room from
 * the culture's pool (§9, seeded); books are sampled per shelf from the single
 * global pool (§8.5). Falls back to placeholder art for a sparse/empty culture.
 */
export function createCachedProvider(manifest: CachedManifest): ContentProvider {
  const books = manifest.books.length > 0 ? manifest.books : LOREM_BOOKS;

  return {
    themeFor: (culture) => CULTURE_THEMES[culture],
    atriumTheme: () => ATRIUM_THEME,
    contentFor: (floor, culture) => buildRoom(manifest, books, floor, culture),
  };
}

function buildRoom(
  manifest: CachedManifest,
  books: BookRef[],
  floor: FloorConfig,
  culture: CultureId,
): RoomContent {
  const art = pickArt(manifest.artByCulture[culture] ?? [], culture, floor.id);
  const artWalls = [0, 1, 2].map((k) => ({
    painting: art[k],
    shelfItem: art[3 + k],
    shelf: sample(books, `${floor.id}:${culture}:${k}:books:${SESSION_SALT}`, BOOKS_PER_SHELF),
  }));
  return { artWalls, centerpiece: art[ART_PER_ROOM - 1] };
}

function pickArt(candidates: Artwork[], culture: CultureId, floorId: string): Artwork[] {
  if (candidates.length === 0) {
    return Array.from({ length: ART_PER_ROOM }, (_, i) =>
      placeholderArtwork(`${floorId}:${culture}:fallback-${i}`, `Untitled — ${culture}`, culture),
    );
  }
  return sample(candidates, `${floorId}:${culture}:art:${SESSION_SALT}`, ART_PER_ROOM);
}
