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
const FEATURED_FRACTION = 0.3; // top 30% by download count = the "legible/canonical" tier (§8.5)
const FEATURED_PER_SHELF = 3; // give every shelf a few recognizable titles, not all obscure

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

/** Every shelf id across the whole tower, in a stable floor→culture→wall order. */
function orderedShelfIds(): string[] {
  const ids: string[] = [];
  for (const floor of [...FLOORS].sort((a, b) => a.level - b.level))
    for (const culture of floor.ring)
      for (let k = 0; k < 3; k++) ids.push(`${floor.id}:${culture}:${k}`);
  return ids;
}

/**
 * Globally unique book placement (Phase 6) with a featured/legible weighting
 * (§8.5). The pool is split by source popularity (Gutenberg download count) into
 * a "featured" tier and the long tail; every shelf is then dealt a few featured
 * titles plus the rest from the tail. Because featured and tail are disjoint and
 * each book is consumed at most once, no text is ever repeated within or across
 * rooms — but shelves are no longer all-obscure. Falls back to a plain unique
 * deal when the cache carries no popularity signal (e.g. a pre-B1 cache).
 */
function dealShelves(pool: BookRef[]): Map<string, BookRef[]> {
  const shelfIds = orderedShelfIds();
  const map = new Map<string, BookRef[]>();

  if (!pool.some((b) => (b.popularity ?? 0) > 0)) {
    const shuffled = sample(pool, `books:${SESSION_SALT}`, pool.length);
    shelfIds.forEach((id, i) =>
      map.set(id, shuffled.slice(i * BOOKS_PER_SHELF, i * BOOKS_PER_SHELF + BOOKS_PER_SHELF)),
    );
    return map;
  }

  const ranked = [...pool].sort((a, b) => (b.popularity ?? 0) - (a.popularity ?? 0));
  const cut = Math.round(ranked.length * FEATURED_FRACTION);
  // Shuffle within each tier so *which* featured/tail books appear varies per
  // visit, while the tier split (legibility) stays stable.
  const featured = sample(ranked.slice(0, cut), `featured:${SESSION_SALT}`, cut);
  const tail = sample(ranked.slice(cut), `tail:${SESSION_SALT}`, ranked.length - cut);

  let fi = 0;
  let ti = 0;
  for (const id of shelfIds) {
    const shelf: BookRef[] = [];
    while (shelf.length < FEATURED_PER_SHELF && fi < featured.length) shelf.push(featured[fi++]);
    while (shelf.length < BOOKS_PER_SHELF && ti < tail.length) shelf.push(tail[ti++]);
    while (shelf.length < BOOKS_PER_SHELF && fi < featured.length) shelf.push(featured[fi++]);
    // Shuffle within the shelf so featured spines aren't always in the same spot.
    map.set(id, sample(shelf, `shelf:${id}:${SESSION_SALT}`, shelf.length));
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
