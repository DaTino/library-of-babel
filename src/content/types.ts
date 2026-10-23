import type { Artwork, BookRef, CultureId, ExhibitCategoryId } from "../model/types";

/** One hallway category's candidate pools (§9.1): illustrated plates for the
 *  walls, specimen photographs for the display cases. */
export interface ExhibitPool {
  plates: Artwork[];
  specimens: Artwork[];
}

/** The build-time cache written by `scripts/fetch-content.ts` (§8). */
export interface CachedManifest {
  generatedAt: string;
  /** Per-culture art candidate pools (§9, algorithmic per-room selection). */
  artByCulture: Partial<Record<CultureId, Artwork[]>>;
  /** One global book pool, sampled per shelf (§8.5). */
  books: BookRef[];
  /** Per-category hallway exhibit pools (§9.1). Absent in pre-hallway caches. */
  exhibitsByCategory?: Partial<Record<ExhibitCategoryId, ExhibitPool>>;
}
