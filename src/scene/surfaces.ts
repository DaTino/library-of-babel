import { RepeatWrapping, type CanvasTexture } from "three";
import { canvas, finish } from "./canvasTextures";
import { hashString, mulberry32 } from "../content/seededRandom";
import { HEX_RADIUS, WALL_HEIGHT } from "../geometry/hexagon";

/**
 * Procedural room surfaces (§6.2 / §6.4): floors and walls drawn on a canvas,
 * one style per culture (set in data/themes.ts). Textures are mostly tonal
 * (grey-scale) and multiplied by the theme's floor/wall color, so a style reads
 * as "stone" or "wood" while the room keeps its palette. Wall textures also bake
 * in soft shading where walls meet the floor, ceiling and each other — a cheap
 * stand-in for ambient occlusion. Nothing to source or license.
 */

export const FLOOR_STYLES = [
  "flagstone",
  "marble",
  "checker",
  "tile",
  "planks",
  "parquet",
  "mosaic",
  "earth",
  "tatami",
  "woven",
] as const;
export type FloorStyle = (typeof FLOOR_STYLES)[number];

export const WALL_STYLES = [
  "plaster",
  "ashlar",
  "panelled",
  "mudbrick",
  "shoji",
  "zellige",
] as const;
export type WallStyle = (typeof WALL_STYLES)[number];

/** World size (m) one floor texture covers before it repeats. */
export const FLOOR_TILE_M: Record<FloorStyle, number> = {
  flagstone: 4,
  marble: 4,
  checker: 2,
  tile: 2,
  planks: 3.2,
  parquet: 1.6,
  mosaic: 2,
  earth: 4,
  tatami: 3.6,
  woven: 1.6,
};

type G = CanvasRenderingContext2D;
type Rng = () => number;

const gray = (v: number, a = 1) => {
  const c = Math.round(Math.max(0, Math.min(1, v)) * 255);
  return a === 1 ? `rgb(${c},${c},${c})` : `rgba(${c},${c},${c},${a})`;
};

/** Soft random blotches (lighter or darker) for stone, plaster and earth. */
function blotches(
  g: G,
  w: number,
  h: number,
  rng: Rng,
  n: number,
  r0: number,
  r1: number,
  a: number,
) {
  for (let i = 0; i < n; i++) {
    const x = rng() * w;
    const y = rng() * h;
    const r = r0 + rng() * (r1 - r0);
    const light = rng() > 0.5;
    const grad = g.createRadialGradient(x, y, 0, x, y, r);
    grad.addColorStop(0, light ? `rgba(255,255,255,${a})` : `rgba(0,0,0,${a})`);
    grad.addColorStop(1, "rgba(0,0,0,0)");
    g.fillStyle = grad;
    // draw wrapped copies so repeating textures stay seamless
    for (const dx of [-w, 0, w])
      for (const dy of [-h, 0, h]) g.fillRect(x - r + dx, y - r + dy, r * 2, r * 2);
  }
}

/** Fine grain speckle. */
function speckle(g: G, w: number, h: number, rng: Rng, n: number, a: number) {
  for (let i = 0; i < n; i++) {
    g.fillStyle = rng() > 0.5 ? `rgba(255,255,255,${a * rng()})` : `rgba(0,0,0,${a * rng()})`;
    g.fillRect(rng() * w, rng() * h, 1 + rng() * 2, 1 + rng() * 2);
  }
}

/** Split `total` into pieces between `min` and `max` that sum exactly to it. */
function pieces(total: number, min: number, max: number, rng: Rng): number[] {
  const out: number[] = [];
  let left = total;
  while (left > max) {
    const p = Math.min(left - min, min + rng() * (max - min));
    out.push(p);
    left -= p;
  }
  out.push(left);
  return out;
}

/** Courses of rectangular blocks (stone floors / walls), wrapping horizontally. */
function courses(
  g: G,
  w: number,
  h: number,
  rng: Rng,
  rowH: number,
  minW: number,
  maxW: number,
  tone: [number, number],
  joint: number,
) {
  g.fillStyle = gray(0.42);
  g.fillRect(0, 0, w, h);
  for (let y = 0; y < h - 1; y += rowH) {
    const widths = pieces(w, minW, maxW, rng);
    let x = rng() * maxW; // random phase per row, wrapped
    for (const bw of widths) {
      const v = tone[0] + rng() * (tone[1] - tone[0]);
      for (const dx of [0, -w]) {
        g.fillStyle = gray(v);
        g.fillRect(x + dx + joint / 2, y + joint / 2, bw - joint, rowH - joint);
        // a faint bevel: light top edge, dark bottom edge
        g.fillStyle = "rgba(255,255,255,0.08)";
        g.fillRect(x + dx + joint / 2, y + joint / 2, bw - joint, joint);
        g.fillStyle = "rgba(0,0,0,0.1)";
        g.fillRect(x + dx + joint / 2, y + rowH - joint * 1.5, bw - joint, joint);
      }
      x += bw;
    }
  }
}

// --- Floors ------------------------------------------------------------------

const FLOOR_PX = 512;

const FLOOR_DRAW: Record<FloorStyle, (g: G, px: number, ppm: number, rng: Rng) => void> = {
  flagstone: (g, px, ppm, rng) => {
    courses(g, px, px, rng, 0.8 * ppm, 0.6 * ppm, 1.3 * ppm, [0.72, 0.92], 0.025 * ppm);
    blotches(g, px, px, rng, 40, 20, 70, 0.1);
    speckle(g, px, px, rng, 2500, 0.12);
  },
  marble: (g, px, ppm, rng) => {
    g.fillStyle = gray(0.93);
    g.fillRect(0, 0, px, px);
    blotches(g, px, px, rng, 30, 30, 90, 0.06);
    g.lineCap = "round";
    for (let i = 0; i < 14; i++) {
      g.strokeStyle = `rgba(70,70,80,${0.08 + rng() * 0.14})`;
      g.lineWidth = 0.6 + rng() * 2;
      g.beginPath();
      let x = rng() * px;
      let y = rng() * px;
      g.moveTo(x, y);
      for (let k = 0; k < 5; k++) {
        const nx = x + (rng() - 0.3) * px * 0.35;
        const ny = y + (rng() - 0.5) * px * 0.35;
        g.quadraticCurveTo(x + (rng() - 0.5) * 60, y + (rng() - 0.5) * 60, nx, ny);
        x = nx;
        y = ny;
      }
      g.stroke();
    }
    g.fillStyle = gray(0.55, 0.6);
    for (let k = 0; k <= 2; k++) {
      g.fillRect(0, k * 2 * ppm - 1, px, 2);
      g.fillRect(k * 2 * ppm - 1, 0, 2, px);
    }
  },
  checker: (g, px, ppm, rng) => {
    const s = 0.5 * ppm;
    for (let i = 0; i < px / s; i++)
      for (let j = 0; j < px / s; j++) {
        g.fillStyle = gray((i + j) % 2 ? 0.32 + rng() * 0.05 : 0.93 + rng() * 0.05);
        g.fillRect(i * s, j * s, s, s);
      }
    blotches(g, px, px, rng, 30, 20, 60, 0.06);
    g.fillStyle = gray(0.5, 0.5);
    for (let k = 0; k <= px / s; k++) {
      g.fillRect(k * s - 0.5, 0, 1, px);
      g.fillRect(0, k * s - 0.5, px, 1);
    }
  },
  tile: (g, px, ppm, rng) => {
    const s = 0.4 * ppm;
    g.fillStyle = gray(0.45);
    g.fillRect(0, 0, px, px);
    for (let i = 0; i < px / s; i++)
      for (let j = 0; j < px / s; j++) {
        g.fillStyle = gray(0.74 + rng() * 0.2);
        g.fillRect(i * s + 2, j * s + 2, s - 4, s - 4);
      }
    speckle(g, px, px, rng, 1800, 0.1);
  },
  planks: (g, px, ppm, rng) => {
    const rowH = 0.2 * ppm;
    g.fillStyle = gray(0.35);
    g.fillRect(0, 0, px, px);
    for (let y = 0; y < px - 1; y += rowH) {
      let x = rng() * ppm;
      for (const bw of pieces(px, 0.9 * ppm, 2 * ppm, rng)) {
        const v = 0.62 + rng() * 0.32;
        for (const dx of [0, -px]) {
          g.fillStyle = gray(v);
          g.fillRect(x + dx + 1, y + 1, bw - 2, rowH - 2);
          // grain
          for (let k = 0; k < 7; k++) {
            g.fillStyle = `rgba(0,0,0,${0.03 + rng() * 0.06})`;
            g.fillRect(x + dx + 1, y + 2 + rng() * (rowH - 4), bw - 2, 1);
          }
        }
        x += bw;
      }
    }
  },
  parquet: (g, px, ppm, rng) => {
    // basket-weave squares of three slats, alternating direction
    const s = 0.4 * ppm;
    const n = Math.round(px / s);
    for (let i = 0; i < n; i++)
      for (let j = 0; j < n; j++) {
        const horizontal = (i + j) % 2 === 0;
        for (let k = 0; k < 3; k++) {
          g.fillStyle = gray(0.6 + rng() * 0.3);
          if (horizontal) g.fillRect(i * s + 1, j * s + (k * s) / 3 + 1, s - 2, s / 3 - 2);
          else g.fillRect(i * s + (k * s) / 3 + 1, j * s + 1, s / 3 - 2, s - 2);
        }
      }
    speckle(g, px, px, rng, 1500, 0.08);
  },
  mosaic: (g, px, ppm, rng) => {
    const s = 0.05 * ppm;
    const n = Math.round(px / s);
    g.fillStyle = gray(0.4);
    g.fillRect(0, 0, px, px);
    for (let i = 0; i < n; i++)
      for (let j = 0; j < n; j++) {
        // a darker border band every metre, like a pavement frame
        const band = i % 20 < 2 || j % 20 < 2;
        g.fillStyle = gray(band ? 0.3 + rng() * 0.1 : 0.78 + rng() * 0.2);
        g.fillRect(i * s + 0.8, j * s + 0.8, s - 1.6, s - 1.6);
      }
  },
  earth: (g, px, _ppm, rng) => {
    g.fillStyle = gray(0.82);
    g.fillRect(0, 0, px, px);
    blotches(g, px, px, rng, 70, 30, 110, 0.12);
    speckle(g, px, px, rng, 6000, 0.18);
  },
  tatami: (g, _px, ppm, rng) => {
    // four 1.8 m cells, each two mats, alternating direction
    const cell = 1.8 * ppm;
    const mat = (x: number, y: number, w: number, h: number, alongX: boolean) => {
      g.fillStyle = gray(0.86 + rng() * 0.06);
      g.fillRect(x, y, w, h);
      g.fillStyle = "rgba(0,0,0,0.07)";
      if (alongX) for (let yy = y; yy < y + h; yy += 3) g.fillRect(x, yy, w, 1);
      else for (let xx = x; xx < x + w; xx += 3) g.fillRect(xx, y, 1, h);
      // dark cloth borders on the long sides
      g.fillStyle = gray(0.25);
      const b = 0.035 * ppm;
      if (alongX) {
        g.fillRect(x, y, w, b);
        g.fillRect(x, y + h - b, w, b);
      } else {
        g.fillRect(x, y, b, h);
        g.fillRect(x + w - b, y, b, h);
      }
      g.strokeStyle = gray(0.5);
      g.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
    };
    for (let i = 0; i < 2; i++)
      for (let j = 0; j < 2; j++) {
        const x = i * cell;
        const y = j * cell;
        if ((i + j) % 2 === 0) {
          mat(x, y, cell, cell / 2, true);
          mat(x, y + cell / 2, cell, cell / 2, true);
        } else {
          mat(x, y, cell / 2, cell, false);
          mat(x + cell / 2, y, cell / 2, cell, false);
        }
      }
  },
  woven: (g, px, ppm, rng) => {
    const s = 0.1 * ppm;
    const n = Math.round(px / s);
    for (let i = 0; i < n; i++)
      for (let j = 0; j < n; j++) {
        const over = (i + j) % 2 === 0;
        const v = 0.75 + rng() * 0.15;
        const grad = over
          ? g.createLinearGradient(i * s, 0, i * s + s, 0)
          : g.createLinearGradient(0, j * s, 0, j * s + s);
        grad.addColorStop(0, gray(v - 0.15));
        grad.addColorStop(0.5, gray(v + 0.05));
        grad.addColorStop(1, gray(v - 0.15));
        g.fillStyle = grad;
        g.fillRect(i * s, j * s, s, s);
      }
  },
};

// --- Walls -------------------------------------------------------------------

const WALL_W = 1024;
const WALL_H = Math.round((WALL_W * WALL_HEIGHT) / HEX_RADIUS); // wall = HEX_RADIUS wide
const WPPM = WALL_W / HEX_RADIUS;
/** Wall height (m) → canvas y (0 = top). */
const wy = (m: number) => WALL_H - m * WPPM;

function plasterBase(g: G, rng: Rng, from = 0, to = WALL_HEIGHT, tone = 0.93) {
  g.fillStyle = gray(tone);
  g.fillRect(0, wy(to), WALL_W, (to - from) * WPPM);
  g.save();
  g.beginPath();
  g.rect(0, wy(to), WALL_W, (to - from) * WPPM);
  g.clip();
  blotches(g, WALL_W, WALL_H, rng, 50, 40, 140, 0.05);
  speckle(g, WALL_W, WALL_H, rng, 5000, 0.06);
  g.restore();
}

const WALL_DRAW: Record<WallStyle, (g: G, rng: Rng) => void> = {
  plaster: (g, rng) => {
    plasterBase(g, rng);
    // painted dado and picture rail lines
    g.fillStyle = "rgba(0,0,0,0.12)";
    g.fillRect(0, wy(1.0), WALL_W, 3);
    g.fillRect(0, wy(3.45), WALL_W, 2);
  },
  ashlar: (g, rng) => {
    courses(g, WALL_W, WALL_H, rng, 0.5 * WPPM, 0.8 * WPPM, 1.5 * WPPM, [0.78, 0.95], 0.02 * WPPM);
    blotches(g, WALL_W, WALL_H, rng, 60, 30, 100, 0.06);
    speckle(g, WALL_W, WALL_H, rng, 6000, 0.08);
  },
  panelled: (g, rng) => {
    plasterBase(g, rng, 1.15);
    // wood wainscot with raised panels
    g.fillStyle = gray(0.58);
    g.fillRect(0, wy(1.15), WALL_W, 1.15 * WPPM);
    const pw = 0.82 * WPPM;
    for (let x = 0.06 * WPPM; x + pw < WALL_W; x += pw + 0.08 * WPPM) {
      const y0 = wy(1.0);
      const ph = 0.78 * WPPM;
      g.fillStyle = gray(0.66 + rng() * 0.06);
      g.fillRect(x, y0, pw, ph);
      g.fillStyle = "rgba(255,255,255,0.12)";
      g.fillRect(x, y0, pw, 3);
      g.fillRect(x, y0, 3, ph);
      g.fillStyle = "rgba(0,0,0,0.22)";
      g.fillRect(x, y0 + ph - 3, pw, 3);
      g.fillRect(x + pw - 3, y0, 3, ph);
    }
    // chair rail
    g.fillStyle = gray(0.45);
    g.fillRect(0, wy(1.18), WALL_W, 0.05 * WPPM);
  },
  mudbrick: (g, rng) => {
    plasterBase(g, rng, 0, WALL_HEIGHT, 0.9);
    // rain-streaks and soft courses of a rendered earthen wall
    for (let i = 0; i < 160; i++) {
      g.fillStyle = `rgba(0,0,0,${0.02 + rng() * 0.05})`;
      g.fillRect(rng() * WALL_W, rng() * WALL_H * 0.6, 1 + rng() * 3, 40 + rng() * 220);
    }
    for (let m = 0.45; m < WALL_HEIGHT; m += 0.45) {
      g.fillStyle = "rgba(0,0,0,0.04)";
      g.fillRect(0, wy(m), WALL_W, 3);
    }
  },
  shoji: (g, rng) => {
    // dark wood base, paper screens with a kumiko lattice, a slatted frieze
    plasterBase(g, rng, 0, WALL_HEIGHT, 0.97);
    g.fillStyle = gray(0.32);
    g.fillRect(0, wy(0.85), WALL_W, 0.85 * WPPM);
    g.fillRect(0, wy(WALL_HEIGHT), WALL_W, 0.7 * WPPM);
    g.fillStyle = "rgba(0,0,0,0.25)";
    for (let x = 0; x < WALL_W; x += 0.12 * WPPM) g.fillRect(x, wy(WALL_HEIGHT), 2, 0.7 * WPPM);
    g.fillStyle = gray(0.35);
    for (let x = 0; x <= WALL_W; x += 0.45 * WPPM)
      g.fillRect(x - 1.5, wy(3.8), 3, (3.8 - 0.85) * WPPM);
    for (let m = 0.85; m <= 3.8; m += 0.3) g.fillRect(0, wy(m) - 1, WALL_W, 2);
    for (let x = 0; x <= WALL_W; x += 1.8 * WPPM)
      g.fillRect(x - 4, wy(3.8), 8, (3.8 - 0.85) * WPPM);
  },
  zellige: (g, rng) => {
    plasterBase(g, rng, 1.6, WALL_HEIGHT, 0.95);
    // glazed tile dado: squares and diamonds in jewel colors
    const top = 1.45;
    const s = 0.24 * WPPM;
    const colors = ["#2f7f7a", "#2b4a8a", "#c9a23a", "#efe8d8", "#1f5f5a"];
    g.fillStyle = "#efe8d8";
    g.fillRect(0, wy(top), WALL_W, top * WPPM);
    for (let x = 0; x < WALL_W + s; x += s)
      for (let y = wy(top); y < WALL_H; y += s) {
        g.fillStyle =
          colors[Math.floor(rng() * 2) + ((Math.round(x / s) + Math.round(y / s)) % 2 ? 0 : 2)];
        g.beginPath();
        g.moveTo(x + s / 2, y + 2);
        g.lineTo(x + s - 2, y + s / 2);
        g.lineTo(x + s / 2, y + s - 2);
        g.lineTo(x + 2, y + s / 2);
        g.closePath();
        g.fill();
      }
    // carved stucco frieze above the tiles
    g.fillStyle = gray(0.84);
    g.fillRect(0, wy(1.62), WALL_W, 0.17 * WPPM);
    g.fillStyle = "rgba(0,0,0,0.18)";
    for (let x = 0; x < WALL_W; x += 0.16 * WPPM) {
      g.beginPath();
      g.arc(x + 0.08 * WPPM, wy(1.47), 0.06 * WPPM, Math.PI, 0);
      g.fill();
    }
  },
};

/** Darken where the wall meets floor, ceiling and the neighbouring walls. */
function wallShading(g: G) {
  const band = (
    x0: number,
    y0: number,
    x1: number,
    y1: number,
    w: number,
    h: number,
    a: number,
  ) => {
    const grad = g.createLinearGradient(x0, y0, x1, y1);
    grad.addColorStop(0, `rgba(0,0,0,${a})`);
    grad.addColorStop(1, "rgba(0,0,0,0)");
    g.fillStyle = grad;
    g.fillRect(Math.min(x0, x1), Math.min(y0, y1), w, h);
  };
  const b = 0.45 * WPPM;
  band(0, WALL_H, 0, WALL_H - b, WALL_W, b, 0.32); // floor
  band(0, 0, 0, b * 0.7, WALL_W, b * 0.7, 0.22); // ceiling
  band(0, 0, b * 0.8, 0, b * 0.8, WALL_H, 0.2); // left corner
  band(WALL_W, 0, WALL_W - b * 0.8, 0, b * 0.8, WALL_H, 0.2); // right corner
}

// --- Cache ---------------------------------------------------------------------

const cache = new Map<string, CanvasTexture>();

/** A repeating floor texture; UVs are in metres (see `metresUV`). */
export function floorTexture(style: FloorStyle): CanvasTexture {
  const key = `floor:${style}`;
  let t = cache.get(key);
  if (!t) {
    const [c, g] = canvas(FLOOR_PX, FLOOR_PX);
    FLOOR_DRAW[style](g, FLOOR_PX, FLOOR_PX / FLOOR_TILE_M[style], mulberry32(hashString(key)));
    t = finish(c);
    t.wrapS = t.wrapT = RepeatWrapping;
    t.repeat.set(1 / FLOOR_TILE_M[style], 1 / FLOOR_TILE_M[style]);
    cache.set(key, t);
  }
  return t;
}

/** A whole-wall texture (one hexagon side, floor to ceiling, with shading). */
export function wallTexture(style: WallStyle): CanvasTexture {
  const key = `wall:${style}`;
  let t = cache.get(key);
  if (!t) {
    const [c, g] = canvas(WALL_W, WALL_H);
    WALL_DRAW[style](g, mulberry32(hashString(key)));
    wallShading(g);
    t = finish(c);
    cache.set(key, t);
  }
  return t;
}

export function isFloorStyle(s: string | undefined): s is FloorStyle {
  return !!s && (FLOOR_STYLES as readonly string[]).includes(s);
}
export function isWallStyle(s: string | undefined): s is WallStyle {
  return !!s && (WALL_STYLES as readonly string[]).includes(s);
}
