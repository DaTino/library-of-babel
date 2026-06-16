import { create } from "zustand";
import type { InteractKind } from "../interaction/types";

/** Which 2D overlay is open over the canvas (§7). Movement locks while open. */
export type OverlayKind = "none" | "art" | "reader" | "credits";

export interface Hovered {
  id: string;
  label: string;
  kind: InteractKind;
}

export interface Interaction {
  id: string;
  label: string;
  kind: InteractKind;
  targetRoomId?: string;
}

interface MuseumState {
  /** Active room id — drives which scene renders (§2.4). */
  currentRoomId: string;
  overlay: OverlayKind;
  /** Audio is gated on a user gesture (§6.6); flips true on "enter". */
  audioEnabled: boolean;
  /** Pointer-lock state (drives the "click to enter" prompt). */
  isLocked: boolean;
  hovered: Hovered | null;
  lastClicked: Interaction | null;

  goToRoom: (id: string) => void;
  openOverlay: (overlay: Exclude<OverlayKind, "none">) => void;
  closeOverlay: () => void;
  enableAudio: () => void;
  setLocked: (v: boolean) => void;
  setHovered: (h: Hovered | null) => void;
  interact: (i: Interaction) => void;
  clearClicked: () => void;
}

// Stateless across sessions (§5, Q8): in-memory only, resets on refresh.
export const useMuseumStore = create<MuseumState>((set) => ({
  currentRoomId: "floor-1:egypt",
  overlay: "none",
  audioEnabled: false,
  isLocked: false,
  hovered: null,
  lastClicked: null,

  goToRoom: (id) => set({ currentRoomId: id }),
  openOverlay: (overlay) => set({ overlay }),
  closeOverlay: () => set({ overlay: "none" }),
  enableAudio: () => set({ audioEnabled: true }),
  setLocked: (v) => set({ isLocked: v }),
  setHovered: (h) => set({ hovered: h }),
  interact: (i) => set({ lastClicked: i }),
  clearClicked: () => set({ lastClicked: null }),
}));
