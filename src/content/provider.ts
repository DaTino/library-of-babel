import type { ContentProvider } from "../model/deriveMuseum";
import type { Artwork, BookRef, CultureId } from "../model/types";
import { FLOORS } from "../config/layout";
import { ATRIUM_THEME, CULTURE_THEMES } from "../data/themes";
import { LOREM_BOOKS, placeholderArtwork } from "../data/placeholder";
import { sample } from "./seededRandom";
import type { CachedManifest } from "./types";

// Reshuffle the Library each visit (§5/§8.5): a per-load salt mixed into seeds.
const SESSION_SALT = Math.random().toString(36).slice(2);
const ART_PER_ROOM = 7; // 3 paintings + 3 shelf artifacts + 1 centerpiece
const BOOKS_PER_SHELF = 10;

/**
 * Content provider backed by the Phase 4 cache (§8). Art is picked per room from
 * the culture's pool (§9, seeded). Books are dealt from the single global pool
 * (§8.5) so each text appears on exactly one shelf — no repeats within or across
 * rooms (Phase 6). Falls back to placeholder art for a sparse/empty culture.
 */
export function createCachedProvider(manifest: CachedManifest): ContentProvider {
  const pool = manifest.books.length > 0 ? manifest.books : LOREM_BOOKS;
  const shelfBooks = dealShelves(pool);

  return {
    themeFor: (culture) => CULTURE_THEMES[culture],
    atriumTheme: () => ATRIUM_THEME,
    contentFor: (floor, culture) => {
      const art = pickArt(manifest.artByCulture[culture] ?? [], culture, floor.id);
      const artWalls = [0, 1, 2].map((k) => ({
        painting: art[k],
        shelfItem: art[3 + k],
        shelf: shelfBooks.get(`${floor.id}:${culture}:${k}`) ?? [],
      }));
      return { artWalls, centerpiece: art[ART_PER_ROOM - 1] };
    },
  };
}

/**
 * Globally unique book placement (Phase 6): shuffle the pool once, then deal
 * consecutive non-overlapping slices to every shelf in a stable room order, so
 * no text is repeated anywhere. If the pool is short, later shelves get fewer.
 */
function dealShelves(pool: BookRef[]): Map<string, BookRef[]> {
  const shuffled = sample(pool, `books:${SESSION_SALT}`, pool.length);
  const map = new Map<string, BookRef[]>();
  let shelfIndex = 0;
  for (const floor of [...FLOORS].sort((a, b) => a.level - b.level)) {
    for (const culture of floor.ring) {
      for (let k = 0; k < 3; k++) {
        const start = shelfIndex * BOOKS_PER_SHELF;
        map.set(`${floor.id}:${culture}:${k}`, shuffled.slice(start, start + BOOKS_PER_SHELF));
        shelfIndex++;
      }
    }
  }
  return map;
}

function pickArt(candidates: Artwork[], culture: CultureId, floorId: string): Artwork[] {
  if (candidates.length === 0) {
    return Array.from({ length: ART_PER_ROOM }, (_, i) =>
      placeholderArtwork(`${floorId}:${culture}:fallback-${i}`, `Untitled — ${culture}`, culture),
    );
  }
  return sample(candidates, `${floorId}:${culture}:art:${SESSION_SALT}`, ART_PER_ROOM);
}
