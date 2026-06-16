/**
 * Core data model — mirrors §4 of library_design_doc.md.
 * Content is data-driven and kept separate from rendering.
 * Every Artwork and BookRef MUST carry a SourceRef (§8.4).
 */

export type CultureId =
  | "egypt"
  | "mesoamerica"
  | "greece"
  | "china"
  | "renaissance_italy"
  | "tudor_england";

export type License = "CC0" | "PD" | "CC-BY" | "CC-BY-SA" | "other";

/** Attribution + license — REQUIRED on every Artwork and BookRef (§8.4). */
export interface SourceRef {
  provider: string; // "The Met" | "Project Gutenberg" | ...
  providerUrl: string;
  license: License;
  attributionText?: string;
  rightsNote?: string;
}

export interface Artwork {
  id: string;
  title: string;
  creator?: string;
  date?: string;
  culture?: CultureId;
  imageUrl: string; // hi-res for the viewer (§7.1)
  thumbUrl: string; // lower-res wall texture
  source: SourceRef;
}

export interface BookRef {
  id: string;
  title: string;
  author?: string;
  language: string;
  readUrl?: string; // direct full-text URL (txt/html/epub)
  externalUrl?: string; // canonical page at source
  source: SourceRef;
}

export interface RoomTheme {
  palette: string[];
  keyLight: { color: string; intensity: number };
  ambientLight: { color: string; intensity: number };
  materials: Record<string, string>;
  ambientAudioUrl?: string; // per-culture soundscape (§6.6); atrium = neutral bed
}

export interface ArtWall {
  wallIndex: number; // 0..5 — art walls sit on even indices {0,2,4} (§3.1)
  painting: Artwork; // upper wall
  shelfItem: Artwork; // sculpture/artifact on top of the shelf
  shelf: BookRef[]; // the books
}

export type ExitKind = "doorway" | "staircase-up" | "staircase-down";

export interface Exit {
  wallIndex?: number; // 0..5 for horizontal doorways; omitted for the central staircase
  kind: ExitKind;
  toRoomId: string; // target room (or target floor's atrium for staircases)
}

export type RoomKind = "atrium" | "themed";

export interface Room {
  id: string; // "{floorId}:atrium" | "{floorId}:{CultureId}"
  kind: RoomKind;
  culture?: CultureId;
  title: string;
  artWalls: ArtWall[]; // 3 for themed, 0 for atrium
  exits: Exit[]; // 3 for themed; 6 (+ staircase) for atrium
  centerpiece?: Artwork; // large sculpture (themed rooms); atrium center = staircase
  theme: RoomTheme; // §6.6
  floorLevel: number; // derived convenience back-reference for navigation/rendering
}

export interface Floor {
  id: string; // "floor-1"
  level: number; // 0 = ground, +1 per floor up
  title?: string;
  ring: CultureId[]; // ordered themed rooms (6 for now)
  rooms: Room[]; // atrium + themed rooms, DERIVED from ring (§2.5)
}

export interface Museum {
  floors: Floor[]; // the tower (§2.6)
}
