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

interface MuseumState {
  // --- Navigation (§2.2 / §2.4) ---
  /** Active room id — drives which scene renders. */
  currentRoomId: string;
  /** Room we arrived from, so the camera enters at the right doorway. */
  entryFromRoomId: string | null;
  /** Target during a transition (set on request, applied at the fade midpoint). */
  pendingTravel: string | null;
  isTraveling: boolean;

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

  /** Begin a gentle transition to another room (ignored mid-transition). */
  requestTravel: (toRoomId: string) => void;
  /** Swap the active room (called while the screen is faded to black). */
  commitTravel: () => void;
  /** End the transition. */
  endTravel: () => void;

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

// Stateless across sessions (§5, Q8): in-memory only, resets on refresh.
export const useMuseumStore = create<MuseumState>((set) => ({
  currentRoomId: "floor-1:atrium",
  entryFromRoomId: null,
  pendingTravel: null,
  isTraveling: false,

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
      s.isTraveling || toRoomId === s.currentRoomId
        ? {}
        : { pendingTravel: toRoomId, isTraveling: true },
    ),
  commitTravel: () =>
    set((s) => ({
      currentRoomId: s.pendingTravel ?? s.currentRoomId,
      entryFromRoomId: s.currentRoomId,
    })),
  endTravel: () => set({ isTraveling: false, pendingTravel: null }),

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
