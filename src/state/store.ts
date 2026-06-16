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
  /** Active room id — drives which scene renders (§2.4). */
  currentRoomId: string;
  overlay: OverlayKind;
  activeArtwork: Artwork | null;
  activeBook: BookRef | null;
  /** Audio is gated on a user gesture (§6.6); flips true on "enter". */
  audioEnabled: boolean;
  /** Pointer-lock state (drives the "click to enter" prompt). */
  isLocked: boolean;
  hovered: Hovered | null;
  /** Transient message when an exit is clicked (navigation is Phase 3). */
  exitToast: string | null;
  /** In-session reading scroll position per book (§7.2). */
  readingPositions: Record<string, number>;

  goToRoom: (id: string) => void;
  openArt: (artwork: Artwork) => void;
  openReader: (book: BookRef) => void;
  openCredits: () => void;
  closeOverlay: () => void;
  enableAudio: () => void;
  setLocked: (v: boolean) => void;
  setHovered: (h: Hovered | null) => void;
  noteExit: (label: string) => void;
  clearExitToast: () => void;
  setReadingPosition: (bookId: string, scrollTop: number) => void;
}

// Stateless across sessions (§5, Q8): in-memory only, resets on refresh.
export const useMuseumStore = create<MuseumState>((set) => ({
  currentRoomId: "floor-1:egypt",
  overlay: "none",
  activeArtwork: null,
  activeBook: null,
  audioEnabled: false,
  isLocked: false,
  hovered: null,
  exitToast: null,
  readingPositions: {},

  goToRoom: (id) => set({ currentRoomId: id }),
  openArt: (artwork) => set({ overlay: "art", activeArtwork: artwork }),
  openReader: (book) => set({ overlay: "reader", activeBook: book }),
  openCredits: () => set({ overlay: "credits" }),
  closeOverlay: () => set({ overlay: "none" }),
  enableAudio: () => set({ audioEnabled: true }),
  setLocked: (v) => set({ isLocked: v }),
  setHovered: (h) => set({ hovered: h }),
  noteExit: (label) => set({ exitToast: label }),
  clearExitToast: () => set({ exitToast: null }),
  setReadingPosition: (bookId, scrollTop) =>
    set((s) => ({ readingPositions: { ...s.readingPositions, [bookId]: scrollTop } })),
}));
