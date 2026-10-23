/**
 * Core data model — mirrors §4 of library_design_doc.md.
 * Content is data-driven and kept separate from rendering.
 * Every Artwork and BookRef MUST carry a SourceRef (§8.4).
 */

export type CultureId =
  // Ground floor
  | "egypt"
  | "mesoamerica"
  | "greece"
  | "china"
  | "renaissance_italy"
  | "tudor_england"
  // Upper gallery
  | "mesopotamia"
  | "pacific_northwest"
  | "rome"
  | "mali_songhai"
  | "napoleonic_france"
  | "edo_japan"
  // The Lantern Gallery (top floor)
  | "plains_lakota"
  | "ancient_india"
  | "viking_norse"
  | "islamic_golden_age"
  | "polynesia"
  | "american_19c";

/** Natural-history exhibit categories — one per hallway (§2.7 / §9.1). */
export type ExhibitCategoryId =
  // Insects (by order)
  | "coleoptera"
  | "lepidoptera"
  | "hymenoptera"
  | "odonata"
  | "orthoptera"
  | "mantodea"
  | "phasmatodea"
  | "hemiptera"
  | "neuroptera"
  | "diptera"
  // Other arthropods
  | "arachnids"
  | "crustaceans"
  | "myriapods"
  | "living_fossils"
  // Plants, fungi & algae
  | "herbarium"
  | "ferns_mosses"
  | "seeds_cones"
  | "orchids_carnivorous"
  | "fungi_lichens"
  | "seaweeds"
  | "botanical_plates"
  // Fossils & deep time
  | "trilobites"
  | "ammonites"
  | "amber"
  | "marine_reptiles"
  | "fossil_plants"
  | "crinoids"
  | "teeth_bones"
  // Sea life & the microscopic
  | "shells"
  | "corals_echinoderms"
  | "jellyfish"
  | "microscopic"
  // Extras
  | "minerals"
  | "meteorites"
  | "eggs_nests"
  | "skeletons";

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
  popularity?: number; // source popularity (Gutenberg download count) — weights the "featured/legible" tier (§8.5)
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
  hallwayId?: string; // doorways open onto a walkable hallway (§2.7)
}

/** How an exhibit is shown in a hallway (§9.1): a framed plate on the wall, or a
 *  specimen in a glass display case down the middle. */
export type ExhibitDisplay = "plate" | "case";

/** One hallway exhibit — an Artwork (so the viewer + credits reuse it) plus how
 *  it's displayed and which category it belongs to. */
export interface Exhibit extends Artwork {
  display: ExhibitDisplay;
  category: ExhibitCategoryId;
}

/** One end of a hallway: the room it opens into and the wall its doorway is on. */
export interface HallwayEnd {
  roomId: string;
  wallIndex: number;
}

/**
 * A walkable hallway joining two rooms (§2.7). It's a self-contained corridor
 * that exists in *both* rooms' coordinate frames; the visitor swaps frames at the
 * middle bend, where neither room is visible. `ends[0]` is the canonical origin
 * that exhibit positions are authored from.
 */
export interface Hallway {
  id: string; // "{floorId}:hall:{a}~{b}"
  floorLevel: number;
  ends: [HallwayEnd, HallwayEnd];
  category: ExhibitCategoryId;
  title: string; // "Beetles"
  subtitle: string; // "Coleoptera"
  exhibits: Exhibit[]; // 8, in slot order (§9.1)
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
  hallways: Hallway[]; // one per doorway edge (12 per floor), DERIVED (§2.7)
}

export interface Museum {
  floors: Floor[]; // the tower (§2.6)
}
