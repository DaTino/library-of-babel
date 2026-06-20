import type { ArtWall, Artwork, CultureId, Exit, Floor, Museum, Room, RoomTheme } from "./types";
import type { FloorConfig } from "../config/layout";
import { FLOORS } from "../config/layout";
import { cultureTitle } from "./labels";

/** Art content for one themed room. `wallIndex` is assigned by deriveMuseum. */
export interface RoomContent {
  artWalls: Omit<ArtWall, "wallIndex">[]; // 3 walls; placed on {0,2,4}
  centerpiece?: Artwork; // large center sculpture
}

/**
 * Pluggable content source. Phase 0 ships a hard-coded placeholder
 * implementation (data/placeholder.ts); the Phase 4 sourcing layer (§8) will
 * implement this same interface against the museum / literature APIs.
 */
export interface ContentProvider {
  themeFor(culture: CultureId): RoomTheme;
  atriumTheme(floor: FloorConfig): RoomTheme;
  contentFor(floor: FloorConfig, culture: CultureId): RoomContent;
}

// Wall-index conventions (§3.1): art on even walls, exits on odd walls.
const ART_WALLS = [0, 2, 4] as const;
const EXIT_WALLS = { atrium: 1, next: 3, prev: 5 } as const;

const atriumId = (floor: FloorConfig) => `${floor.id}:atrium`;
const themedId = (floor: FloorConfig, culture: CultureId) => `${floor.id}:${culture}`;

/**
 * Build the full museum graph from the FLOORS config (§2.5).
 * The per-floor wheel graph (§2.2) and the vertical staircase edges (§2.6) are
 * DERIVED here — adjacency is never hand-authored.
 */
export function deriveMuseum(
  floors: readonly FloorConfig[] = FLOORS,
  content: ContentProvider,
): Museum {
  // Sort by level so staircase linking (atrium n <-> atrium n+1) is unambiguous.
  const ordered = [...floors].sort((a, b) => a.level - b.level);
  const byLevel = new Map<number, FloorConfig>();
  for (const f of ordered) byLevel.set(f.level, f);

  const builtFloors: Floor[] = ordered.map((floor) => {
    const ring = floor.ring;
    const n = ring.length;

    // --- Themed rooms (the rim) ---
    const themedRooms: Room[] = ring.map((culture, i) => {
      const next = ring[(i + 1) % n];
      const prev = ring[(i - 1 + n) % n];
      const { artWalls: rawWalls, centerpiece } = content.contentFor(floor, culture);

      // Place the 3 art walls on {0,2,4} regardless of source ordering.
      const artWalls: ArtWall[] = rawWalls
        .slice(0, ART_WALLS.length)
        .map((wall, k) => ({ ...wall, wallIndex: ART_WALLS[k] }));

      // 3 exits on alternating walls {1,3,5}: atrium, next-room, prev-room (§2.2).
      const exits: Exit[] = [
        { kind: "doorway", wallIndex: EXIT_WALLS.atrium, toRoomId: atriumId(floor) },
        { kind: "doorway", wallIndex: EXIT_WALLS.next, toRoomId: themedId(floor, next) },
        { kind: "doorway", wallIndex: EXIT_WALLS.prev, toRoomId: themedId(floor, prev) },
      ];

      return {
        id: themedId(floor, culture),
        kind: "themed",
        culture,
        title: cultureTitle(culture),
        artWalls,
        exits,
        centerpiece,
        theme: content.themeFor(culture),
        floorLevel: floor.level,
      };
    });

    // --- Atrium (the hub): all 6 walls are exits (§3.2) ---
    const atriumExits: Exit[] = ring.map((culture, i) => ({
      kind: "doorway",
      wallIndex: i,
      toRoomId: themedId(floor, culture),
    }));

    // Vertical staircase edges (§2.6). Finite tower: ground = up-only, top = down-only.
    const above = byLevel.get(floor.level + 1);
    const below = byLevel.get(floor.level - 1);
    if (above) atriumExits.push({ kind: "staircase-up", toRoomId: atriumId(above) });
    if (below) atriumExits.push({ kind: "staircase-down", toRoomId: atriumId(below) });

    const atrium: Room = {
      id: atriumId(floor),
      kind: "atrium",
      title: floor.title,
      artWalls: [],
      exits: atriumExits,
      theme: content.atriumTheme(floor),
      floorLevel: floor.level,
    };

    return {
      id: floor.id,
      level: floor.level,
      title: floor.title,
      ring: [...ring],
      rooms: [atrium, ...themedRooms],
    };
  });

  return { floors: builtFloors };
}

/** Flat id → Room lookup across the whole tower (navigation convenience). */
export function roomsById(museum: Museum): Map<string, Room> {
  const map = new Map<string, Room>();
  for (const floor of museum.floors) {
    for (const room of floor.rooms) map.set(room.id, room);
  }
  return map;
}
