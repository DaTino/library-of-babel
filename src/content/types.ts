import type { Artwork, BookRef, CultureId } from "../model/types";

/** The build-time cache written by `scripts/fetch-content.ts` (§8). */
export interface CachedManifest {
  generatedAt: string;
  /** Per-culture art candidate pools (§9, algorithmic per-room selection). */
  artByCulture: Partial<Record<CultureId, Artwork[]>>;
  /** One global book pool, sampled per shelf (§8.5). */
  books: BookRef[];
}
