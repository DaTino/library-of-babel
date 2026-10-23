import { create } from "zustand";
import type { Artwork, BookRef } from "../model/types";
import type { InteractKind } from "../interaction/types";

/** Which 2D overlay is open over the canvas (§7). Movement locks while open. */
export type OverlayKind = "none" | "art" | "reader" | "credits";

export interface Hovered {
  id: string;
  label: string;
  kind: InteractKind;
}

/**
 * How the camera got into the current room — the CameraRig uses it to place the
 * camera when the room changes:
 *  - spawn / fade: stand just inside the doorway we came from (§2.4)
 *  - hallway: re-express the pose in the new room's frame (§2.7), seamlessly
 *  - stairs: re-base after a climb by shifting down/up one floor (§2.6)
 *  - settled: already applied (so a remount never applies it twice)
 */
export type Arrival =
  | { kind: "spawn" }
  | { kind: "fade" }
  | { kind: "hallway"; fromWall: number; toWall: number }
  | { kind: "stairs"; dy: number }
  | { kind: "settled" };

/** The hallway the visitor is walking in, and how far along it (0 at the current
 *  room's door → 1 at the far room's door). Drives the HUD + the audio blend. */
export interface HallwayPosition {
  id: string;
  otherRoomId: string;
  t: number;
}

/** An in-progress walk up or down the spiral stair (§2.6). */
export interface Climb {
  toRoomId: string;
  dir: 1 | -1;
}

export type StairPrompt = "up" | "down" | "both" | null;

interface MuseumState {
  // --- Navigation (§2.2 / §2.4 / §2.7) ---
  /** Active room id — drives which scene renders. */
  currentRoomId: string;
  /** Room we arrived from, so the camera enters at the right doorway. */
  entryFromRoomId: string | null;
  arrival: Arrival;
  /** Target during a fade (R → atrium), applied at the fade midpoint. */
  pendingTravel: string | null;
  isTraveling: boolean;
  hallway: HallwayPosition | null;
  climb: Climb | null;
  /** Shown while standing in the stair tower's doorway (§2.6). */
  stairPrompt: StairPrompt;

  // --- Overlays (§7) ---
  overlay: OverlayKind;
  activeArtwork: Artwork | null;
  activeBook: BookRef | null;

  audioEnabled: boolean;
  /** Ambient audio mute toggle (§6.6). */
  muted: boolean;
  isLocked: boolean;
  hovered: Hovered | null;
  readingPositions: Record<string, number>;

  /** Begin a faded jump to another room (R → atrium; ignored mid-move). */
  requestTravel: (toRoomId: string) => void;
  /** Swap the active room (called while the screen is faded to black). */
  commitTravel: () => void;
  /** End the fade. */
  endTravel: () => void;
  /** Walked past a hallway's midpoint: hand over to the far room (§2.7). */
  traverseHallway: (toRoomId: string, fromWall: number, toWall: number) => void;
  setHallway: (h: HallwayPosition | null) => void;
  /** Start walking the spiral stair to another floor's atrium (§2.6). */
  startClimb: (toRoomId: string, dir: 1 | -1) => void;
  /** The climb reached the far landing: re-base into the destination atrium. */
  finishClimb: (floorToFloor: number) => void;
  setStairPrompt: (p: StairPrompt) => void;

  openArt: (artwork: Artwork) => void;
  openReader: (book: BookRef) => void;
  openCredits: () => void;
  closeOverlay: () => void;
  enableAudio: () => void;
  toggleMute: () => void;
  setLocked: (v: boolean) => void;
  setHovered: (h: Hovered | null) => void;
  setReadingPosition: (bookId: string, scrollTop: number) => void;
}

const busy = (s: MuseumState) => s.isTraveling || s.climb !== null;

// Stateless across sessions (§5, Q8): in-memory only, resets on refresh.
export const useMuseumStore = create<MuseumState>((set) => ({
  currentRoomId: "floor-1:atrium",
  entryFromRoomId: null,
  arrival: { kind: "spawn" },
  pendingTravel: null,
  isTraveling: false,
  hallway: null,
  climb: null,
  stairPrompt: null,

  overlay: "none",
  activeArtwork: null,
  activeBook: null,
  audioEnabled: false,
  muted: false,
  isLocked: false,
  hovered: null,
  readingPositions: {},

  requestTravel: (toRoomId) =>
    set((s) =>
      busy(s) || toRoomId === s.currentRoomId ? {} : { pendingTravel: toRoomId, isTraveling: true },
    ),
  commitTravel: () =>
    set((s) => ({
      currentRoomId: s.pendingTravel ?? s.currentRoomId,
      entryFromRoomId: s.currentRoomId,
      arrival: { kind: "fade" },
      hallway: null,
    })),
  endTravel: () => set({ isTraveling: false, pendingTravel: null }),

  traverseHallway: (toRoomId, fromWall, toWall) =>
    set((s) =>
      busy(s) || toRoomId === s.currentRoomId
        ? {}
        : {
            currentRoomId: toRoomId,
            entryFromRoomId: s.currentRoomId,
            arrival: { kind: "hallway", fromWall, toWall },
            // Same spot, seen from the other end — keeps the audio blend continuous.
            hallway: s.hallway
              ? {
                  id: s.hallway.id,
                  otherRoomId: s.currentRoomId,
                  t: Math.round((1 - s.hallway.t) * 100) / 100,
                }
              : null,
          },
    ),
  setHallway: (hallway) => set({ hallway }),

  startClimb: (toRoomId, dir) =>
    set((s) => (busy(s) ? {} : { climb: { toRoomId, dir }, stairPrompt: null, hovered: null })),
  finishClimb: (floorToFloor) =>
    set((s) =>
      s.climb
        ? {
            currentRoomId: s.climb.toRoomId,
            entryFromRoomId: s.currentRoomId,
            arrival: { kind: "stairs", dy: -s.climb.dir * floorToFloor },
            climb: null,
          }
        : {},
    ),
  setStairPrompt: (stairPrompt) => set({ stairPrompt }),

  openArt: (artwork) => set({ overlay: "art", activeArtwork: artwork }),
  openReader: (book) => set({ overlay: "reader", activeBook: book }),
  openCredits: () => set({ overlay: "credits" }),
  closeOverlay: () => set({ overlay: "none" }),
  enableAudio: () => set({ audioEnabled: true }),
  toggleMute: () => set((s) => ({ muted: !s.muted })),
  setLocked: (v) => set({ isLocked: v }),
  setHovered: (h) => set({ hovered: h }),
  setReadingPosition: (bookId, scrollTop) =>
    set((s) => ({ readingPositions: { ...s.readingPositions, [bookId]: scrollTop } })),
}));
