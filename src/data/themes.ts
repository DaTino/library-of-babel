import type { CultureId, RoomTheme } from "../model/types";

/** Per-culture room themes (§6.4 / §6.6). Local — not fetched — so both the
 *  placeholder and the cached (Phase 4) content providers share them. */
export const CULTURE_THEMES: Record<CultureId, RoomTheme> = {
  egypt: {
    palette: ["#c2a25a", "#8a6d3b", "#e8d5a0"],
    keyLight: { color: "#ffe8b0", intensity: 1.2 },
    ambientLight: { color: "#caa86a", intensity: 0.5 },
    materials: { floor: "#8a6d3b", wall: "#e8d5a0" },
  },
  mesoamerica: {
    palette: ["#3a5f4a", "#7a6f5d", "#c9b79c"],
    keyLight: { color: "#fff0d0", intensity: 1.0 },
    ambientLight: { color: "#7a8f7a", intensity: 0.45 },
    materials: { floor: "#7a6f5d", wall: "#c9b79c" },
  },
  greece: {
    palette: ["#dfe3e6", "#9fb1bd", "#f5f5f0"],
    keyLight: { color: "#f4f8ff", intensity: 1.3 },
    ambientLight: { color: "#bcd0dd", intensity: 0.55 },
    materials: { floor: "#9fb1bd", wall: "#f5f5f0" },
  },
  china: {
    palette: ["#b8c9c0", "#6b4f3a", "#e7e2d6"],
    keyLight: { color: "#fff4e0", intensity: 1.1 },
    ambientLight: { color: "#9fb3a8", intensity: 0.5 },
    materials: { floor: "#6b4f3a", wall: "#e7e2d6" },
  },
  renaissance_italy: {
    palette: ["#b07a3c", "#5e4326", "#e3c79a"],
    keyLight: { color: "#ffe0a8", intensity: 1.15 },
    ambientLight: { color: "#a8804a", intensity: 0.5 },
    materials: { floor: "#5e4326", wall: "#e3c79a" },
  },
  tudor_england: {
    palette: ["#5a3a2a", "#7a2230", "#d9c7a3"],
    keyLight: { color: "#ffe6c0", intensity: 1.0 },
    ambientLight: { color: "#6e5240", intensity: 0.45 },
    materials: { floor: "#5a3a2a", wall: "#d9c7a3" },
  },
};

/** Neutral, legible atrium bed (§3.2) — the wayfinding anchor. */
export const ATRIUM_THEME: RoomTheme = {
  palette: ["#3c3c46", "#4a4a54", "#cdb37a"],
  keyLight: { color: "#fff6e6", intensity: 1.5 },
  ambientLight: { color: "#9a9aa6", intensity: 0.85 },
  materials: { floor: "#4a4a54", wall: "#5a5a66" },
};
