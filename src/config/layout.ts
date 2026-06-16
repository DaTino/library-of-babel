import type { CultureId } from "../model/types";

/**
 * src/config/layout.ts — single source of truth for floors, rooms, and ring
 * order (§2.5). The per-floor wheel graph (§2.2) and the vertical staircase
 * edges (§2.6) are DERIVED from this at load time (see model/deriveMuseum.ts).
 * Do not hand-author adjacency.
 */
export interface FloorConfig {
  id: string;
  level: number; // 0 = ground; higher = up the tower
  title: string;
  ring: CultureId[]; // ordered themed rooms around this floor's ring
}

export const FLOORS: FloorConfig[] = [
  {
    id: "floor-1",
    level: 0,
    title: "Ground Floor",
    ring: ["egypt", "mesoamerica", "greece", "china", "renaissance_italy", "tudor_england"],
  },
  {
    id: "floor-2",
    level: 1,
    title: "Upper Gallery",
    ring: ["greece", "renaissance_italy", "tudor_england", "egypt", "china", "mesoamerica"],
  },
  // To add capacity: append another floor here (its own atrium + 6-room ring).
  // To reorder a floor's ring: reorder its `ring` array.
];
