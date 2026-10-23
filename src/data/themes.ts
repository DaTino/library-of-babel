import type { CultureId, RoomTheme } from "../model/types";

/** Per-culture room themes (§6.4 / §6.6). Local — not fetched — so both the
 *  placeholder and the cached (Phase 4) content providers share them. */
export const CULTURE_THEMES: Record<CultureId, RoomTheme> = {
  egypt: {
    palette: ["#c2a25a", "#8a6d3b", "#e8d5a0"],
    keyLight: { color: "#ffe8b0", intensity: 1.2 },
    ambientLight: { color: "#caa86a", intensity: 0.5 },
    materials: { floor: "#8a6d3b", wall: "#e8d5a0", floorStyle: "flagstone", wallStyle: "ashlar" },
  },
  mesoamerica: {
    palette: ["#3a5f4a", "#7a6f5d", "#c9b79c"],
    keyLight: { color: "#fff0d0", intensity: 1.0 },
    ambientLight: { color: "#7a8f7a", intensity: 0.45 },
    materials: { floor: "#7a6f5d", wall: "#c9b79c", floorStyle: "flagstone", wallStyle: "ashlar" },
  },
  greece: {
    palette: ["#dfe3e6", "#9fb1bd", "#f5f5f0"],
    keyLight: { color: "#f4f8ff", intensity: 1.3 },
    ambientLight: { color: "#bcd0dd", intensity: 0.55 },
    materials: { floor: "#9fb1bd", wall: "#f5f5f0", floorStyle: "marble", wallStyle: "plaster" },
  },
  china: {
    palette: ["#b8c9c0", "#6b4f3a", "#e7e2d6"],
    keyLight: { color: "#fff4e0", intensity: 1.1 },
    ambientLight: { color: "#9fb3a8", intensity: 0.5 },
    materials: { floor: "#6b4f3a", wall: "#e7e2d6", floorStyle: "tile", wallStyle: "panelled" },
  },
  renaissance_italy: {
    palette: ["#b07a3c", "#5e4326", "#e3c79a"],
    keyLight: { color: "#ffe0a8", intensity: 1.15 },
    ambientLight: { color: "#a8804a", intensity: 0.5 },
    materials: { floor: "#cbb79a", wall: "#e3c79a", floorStyle: "checker", wallStyle: "plaster" },
  },
  tudor_england: {
    palette: ["#5a3a2a", "#7a2230", "#d9c7a3"],
    keyLight: { color: "#ffe6c0", intensity: 1.0 },
    ambientLight: { color: "#6e5240", intensity: 0.45 },
    materials: { floor: "#5a3a2a", wall: "#d9c7a3", floorStyle: "planks", wallStyle: "panelled" },
  },

  // --- Upper gallery ---
  mesopotamia: {
    palette: ["#c08a4a", "#6b4a2a", "#3a5a8a"],
    keyLight: { color: "#ffe0a8", intensity: 1.1 },
    ambientLight: { color: "#b08850", intensity: 0.5 },
    materials: { floor: "#6b4a2a", wall: "#cbb083", floorStyle: "tile", wallStyle: "mudbrick" },
  },
  pacific_northwest: {
    palette: ["#7a2e22", "#1c1c1c", "#3a5f4a"],
    keyLight: { color: "#f0ead8", intensity: 1.0 },
    ambientLight: { color: "#5a6b5a", intensity: 0.5 },
    materials: { floor: "#3a2a22", wall: "#6e5a44", floorStyle: "planks", wallStyle: "panelled" },
  },
  rome: {
    palette: ["#e8e2d2", "#8a2230", "#b8a14a"],
    keyLight: { color: "#fff4e0", intensity: 1.3 },
    ambientLight: { color: "#cdbfa0", intensity: 0.55 },
    materials: { floor: "#b8a98c", wall: "#efe9da", floorStyle: "mosaic", wallStyle: "plaster" },
  },
  mali_songhai: {
    palette: ["#caa23a", "#7a4a22", "#9a5a2a"],
    keyLight: { color: "#ffe6b0", intensity: 1.1 },
    ambientLight: { color: "#b08040", intensity: 0.5 },
    materials: { floor: "#6e4a2a", wall: "#c9a877", floorStyle: "earth", wallStyle: "mudbrick" },
  },
  napoleonic_france: {
    palette: ["#1f3a6e", "#caa23a", "#7a1f2a"],
    keyLight: { color: "#fff0d0", intensity: 1.15 },
    ambientLight: { color: "#6a7a9a", intensity: 0.5 },
    materials: { floor: "#2a2a3a", wall: "#cdb78a", floorStyle: "parquet", wallStyle: "panelled" },
  },
  edo_japan: {
    palette: ["#2a3a5a", "#1a1a1a", "#d8cdb0"],
    keyLight: { color: "#f4f0e0", intensity: 1.1 },
    ambientLight: { color: "#7a8aa0", intensity: 0.5 },
    materials: { floor: "#c9b67c", wall: "#efe6d0", floorStyle: "tatami", wallStyle: "shoji" },
  },

  // --- The Lantern Gallery (top floor) ---
  plains_lakota: {
    palette: ["#a83e2a", "#caa15a", "#3a5a7a"],
    keyLight: { color: "#ffe2b0", intensity: 1.15 },
    ambientLight: { color: "#9a7a5a", intensity: 0.5 },
    materials: { floor: "#6e4a32", wall: "#cda878", floorStyle: "earth", wallStyle: "plaster" },
  },
  ancient_india: {
    palette: ["#c8762a", "#9a2a3a", "#1f6a5a"],
    keyLight: { color: "#ffe6b0", intensity: 1.15 },
    ambientLight: { color: "#b07a4a", intensity: 0.5 },
    materials: { floor: "#6e4630", wall: "#d3b483", floorStyle: "flagstone", wallStyle: "ashlar" },
  },
  viking_norse: {
    palette: ["#3a4a5a", "#6e2a2a", "#8a7a64"],
    keyLight: { color: "#d8e4f0", intensity: 1.0 },
    ambientLight: { color: "#5a6a7a", intensity: 0.45 },
    materials: { floor: "#2e2a26", wall: "#5a5e62", floorStyle: "planks", wallStyle: "panelled" },
  },
  islamic_golden_age: {
    palette: ["#1f8a82", "#c9a23a", "#26407a"],
    keyLight: { color: "#fff2da", intensity: 1.2 },
    ambientLight: { color: "#4a8a86", intensity: 0.55 },
    materials: { floor: "#5a7a86", wall: "#f1e8d6", floorStyle: "tile", wallStyle: "zellige" },
  },
  polynesia: {
    palette: ["#1f8a8a", "#a8512a", "#d8b888"],
    keyLight: { color: "#fff2dc", intensity: 1.15 },
    ambientLight: { color: "#5a8a86", intensity: 0.5 },
    materials: { floor: "#b99a68", wall: "#c7a878", floorStyle: "woven", wallStyle: "plaster" },
  },
  american_19c: {
    palette: ["#2a3a5a", "#7a2a2a", "#d8c8a8"],
    keyLight: { color: "#ffecc8", intensity: 1.1 },
    ambientLight: { color: "#7a6a5a", intensity: 0.5 },
    materials: { floor: "#4a3525", wall: "#d8caa8", floorStyle: "planks", wallStyle: "panelled" },
  },
};

/** Neutral, legible atrium bed (§3.2) — the wayfinding anchor. */
export const ATRIUM_THEME: RoomTheme = {
  palette: ["#3c3c46", "#4a4a54", "#cdb37a"],
  keyLight: { color: "#fff6e6", intensity: 1.5 },
  ambientLight: { color: "#9a9aa6", intensity: 0.85 },
  materials: { floor: "#77726a", wall: "#8f897d", floorStyle: "marble", wallStyle: "ashlar" },
};
