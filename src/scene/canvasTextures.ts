import { CanvasTexture, SRGBColorSpace } from "three";
import { ellipsize, wrapText } from "./textLayout";

/**
 * Small procedural textures drawn on a 2D canvas (no image files to source or
 * license). Used for signage, museum labels, book spines and wall text — real 3D
 * planes, so walls occlude them, unlike DOM overlays — and for the hallways' fake
 * lighting (§2.7), whose surfaces are unlit so they look identical in both rooms'
 * frames.
 */

export function canvas(w: number, h: number): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  return [c, c.getContext("2d")!];
}

export function finish(c: HTMLCanvasElement): CanvasTexture {
  const t = new CanvasTexture(c);
  t.colorSpace = SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

const SERIF = 'Georgia, "Times New Roman", serif';
const font = (px: number, opts: { bold?: boolean; italic?: boolean } = {}) =>
  `${opts.italic ? "italic " : ""}${opts.bold ? "600 " : ""}${Math.round(px)}px ${SERIF}`;

export interface TextLine {
  text: string;
  /** Font size as a fraction of the sign's height. */
  size: number;
  color?: string;
  italic?: boolean;
  bold?: boolean;
  /** Extra letter spacing in px (uppercase captions). */
  tracking?: number;
}

export interface SignStyle {
  background: string;
  border?: string;
  /** Pixels per world unit — sharpness. */
  ppu?: number;
}

/** A sign: rounded panel + centered lines of serif text. */
export function signTexture(
  lines: TextLine[],
  width: number,
  height: number,
  style: SignStyle,
): CanvasTexture {
  const ppu = style.ppu ?? 320;
  const [c, g] = canvas(Math.round(width * ppu), Math.round(height * ppu));
  const W = c.width;
  const Hh = c.height;
  const r = Math.min(W, Hh) * 0.08;

  g.fillStyle = style.background;
  g.beginPath();
  g.roundRect(2, 2, W - 4, Hh - 4, r);
  g.fill();
  if (style.border) {
    g.strokeStyle = style.border;
    g.lineWidth = Math.max(2, Hh * 0.018);
    g.beginPath();
    g.roundRect(Hh * 0.04, Hh * 0.04, W - Hh * 0.08, Hh - Hh * 0.08, r * 0.7);
    g.stroke();
  }

  const total = lines.reduce((s, l) => s + l.size * Hh * 1.25, 0);
  let y = (Hh - total) / 2;
  g.textAlign = "center";
  g.textBaseline = "top";
  for (const l of lines) {
    const px = l.size * Hh;
    const font = (size: number) =>
      `${l.italic ? "italic " : ""}${l.bold ? "600 " : ""}${size}px Georgia, "Times New Roman", serif`;
    g.fillStyle = l.color ?? "#e8e4d8";
    g.letterSpacing = l.tracking ? `${l.tracking}px` : "0px";
    let text = l.text;
    // Too long? Shrink the type first (down to 60%), and only then truncate.
    let size = px;
    g.font = font(size);
    while (g.measureText(text).width > W * 0.9 && size > px * 0.6) {
      size *= 0.94;
      g.font = font(size);
    }
    while (g.measureText(text).width > W * 0.9 && text.length > 4) text = text.slice(0, -2) + "…";
    g.fillText(text, W / 2, y + px * 0.12 + (px - size) / 2);
    y += px * 1.25;
  }
  return finish(c);
}

/**
 * Vertical wall shading for an unlit surface: darker at the floor (a baseboard
 * band), brightest at picture height, falling off toward the ceiling, with a thin
 * picture-rail line. Multiplied by the material color.
 */
export function wallGradientTexture(): CanvasTexture {
  const [c, g] = canvas(4, 256);
  const grad = g.createLinearGradient(0, 256, 0, 0); // bottom → top
  grad.addColorStop(0, "#3a3530");
  grad.addColorStop(0.06, "#3a3530");
  grad.addColorStop(0.065, "#8d8478");
  grad.addColorStop(0.45, "#ffffff");
  grad.addColorStop(0.78, "#cfc7ba");
  grad.addColorStop(1, "#6f685f");
  g.fillStyle = grad;
  g.fillRect(0, 0, 4, 256);
  // picture rail at ~83% of the height
  g.fillStyle = "#9b8a6a";
  g.fillRect(0, Math.round(256 * (1 - 0.83)), 4, 3);
  return finish(c);
}

/** A soft radial pool of light (white center → transparent), for additive glows. */
export function glowTexture(): CanvasTexture {
  const [c, g] = canvas(128, 128);
  const grad = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  grad.addColorStop(0, "rgba(255,255,255,1)");
  grad.addColorStop(0.35, "rgba(255,255,255,0.45)");
  grad.addColorStop(1, "rgba(255,255,255,0)");
  g.fillStyle = grad;
  g.fillRect(0, 0, 128, 128);
  return finish(c);
}

// --- Museum labels (§7 / §9.1) ---------------------------------------------

export interface LabelContent {
  title: string;
  /** Italic detail lines under the title (creator · date, scientific name…). */
  lines?: string[];
  /** Small credit line at the foot (provider · license). */
  footer?: string;
}

/**
 * A museum object label: cream card, title in bold, details in italic, credit
 * line at the bottom — the kind of card that sits beside a painting.
 */
export function labelTexture(c: LabelContent, width: number, height: number): CanvasTexture {
  const ppu = 900;
  const [cv, g] = canvas(Math.round(width * ppu), Math.round(height * ppu));
  const W = cv.width;
  const H = cv.height;
  const pad = Math.min(W, H) * 0.09;
  const inner = W - pad * 2;

  g.fillStyle = "#ece5d3";
  g.fillRect(0, 0, W, H);
  g.strokeStyle = "rgba(60,48,32,0.35)";
  g.lineWidth = Math.max(1, H * 0.008);
  g.strokeRect(g.lineWidth, g.lineWidth, W - g.lineWidth * 2, H - g.lineWidth * 2);
  g.textBaseline = "top";
  g.textAlign = "left";

  const titlePx = H * 0.135;
  const linePx = H * 0.085;
  const footPx = H * 0.07;
  const footY = H - pad - footPx;
  let y = pad;

  g.fillStyle = "#2a2219";
  g.font = font(titlePx, { bold: true });
  const measure = (s: string) => g.measureText(s).width;
  const room = Math.max(
    1,
    Math.floor((footY - y - (c.lines?.length ?? 0) * linePx * 1.3) / (titlePx * 1.18)),
  );
  for (const l of wrapText(c.title, inner, measure, Math.min(3, room))) {
    g.fillText(l, pad, y);
    y += titlePx * 1.18;
  }
  y += titlePx * 0.15;

  g.fillStyle = "#4a3d2c";
  g.font = font(linePx, { italic: true });
  for (const line of c.lines ?? []) {
    if (!line || y + linePx > footY) continue;
    for (const l of wrapText(line, inner, measure, 2)) {
      if (y + linePx > footY - linePx * 0.3) break;
      g.fillText(l, pad, y);
      y += linePx * 1.3;
    }
  }

  if (c.footer) {
    g.fillStyle = "#7a6a52";
    g.font = font(footPx);
    g.fillText(ellipsize(c.footer, inner, measure), pad, footY);
  }
  return finish(cv);
}

/**
 * Introductory wall text for a gallery (§7.4): dark panel, gilt rule, the
 * room's name, its dates, and a short paragraph.
 */
export function introPanelTexture(
  heading: string,
  title: string,
  dates: string,
  body: string,
  width: number,
  height: number,
): CanvasTexture {
  const ppu = 620;
  const [cv, g] = canvas(Math.round(width * ppu), Math.round(height * ppu));
  const W = cv.width;
  const H = cv.height;
  const pad = W * 0.1;
  const inner = W - pad * 2;

  g.fillStyle = "#15120e";
  g.fillRect(0, 0, W, H);
  g.strokeStyle = "rgba(201,168,106,0.55)";
  g.lineWidth = Math.max(2, W * 0.006);
  g.strokeRect(W * 0.035, W * 0.035, W - W * 0.07, H - W * 0.07);
  g.textBaseline = "top";
  g.textAlign = "left";
  const measure = (s: string) => g.measureText(s).width;
  let y = pad;

  g.fillStyle = "#b9a37a";
  g.font = font(W * 0.042);
  g.letterSpacing = `${Math.round(W * 0.008)}px`;
  g.fillText(ellipsize(heading.toUpperCase(), inner, measure), pad, y);
  g.letterSpacing = "0px";
  y += W * 0.075;

  let titlePx = W * 0.085;
  g.font = font(titlePx, { bold: true });
  while (measure(title) > inner && titlePx > W * 0.055) {
    titlePx *= 0.94;
    g.font = font(titlePx, { bold: true });
  }
  g.fillStyle = "#efe7d4";
  for (const l of wrapText(title, inner, measure, 2)) {
    g.fillText(l, pad, y);
    y += titlePx * 1.15;
  }

  g.fillStyle = "#c9a86a";
  g.font = font(W * 0.045, { italic: true });
  g.fillText(ellipsize(dates, inner, measure), pad, y + W * 0.01);
  y += W * 0.085;

  g.fillStyle = "rgba(201,168,106,0.6)";
  g.fillRect(pad, y, inner * 0.3, Math.max(2, W * 0.004));
  y += W * 0.05;

  const bodyPx = W * 0.046;
  g.fillStyle = "#d8cfbc";
  g.font = font(bodyPx);
  const maxLines = Math.floor((H - pad - y) / (bodyPx * 1.45));
  for (const l of wrapText(body, inner, measure, maxLines)) {
    g.fillText(l, pad, y);
    y += bodyPx * 1.45;
  }
  return finish(cv);
}

export interface SpineDraw {
  /** Left edge and width (m), from the row's left end. */
  x: number;
  width: number;
  /** Height (m), standing on the row's base. */
  height: number;
  color: string;
  title: string;
}

/**
 * One texture for a whole row of book spines (§3.1): each spine its own color,
 * gilt bands top and bottom, and the title running top-to-bottom in gilt —
 * transparent between books, so it can sit just in front of the book boxes.
 */
export function spinesTexture(
  spines: SpineDraw[],
  rowWidth: number,
  rowHeight: number,
): CanvasTexture {
  const ppu = 640;
  const [cv, g] = canvas(Math.round(rowWidth * ppu), Math.round(rowHeight * ppu));
  const H = cv.height;
  g.clearRect(0, 0, cv.width, H);
  for (const s of spines) {
    const x = s.x * ppu;
    const w = s.width * ppu;
    const h = s.height * ppu;
    const top = H - h;
    // body with a soft rounded-spine shading
    const grad = g.createLinearGradient(x, 0, x + w, 0);
    grad.addColorStop(0, "rgba(0,0,0,0.35)");
    grad.addColorStop(0.35, "rgba(255,255,255,0.06)");
    grad.addColorStop(1, "rgba(0,0,0,0.4)");
    g.fillStyle = s.color;
    g.fillRect(x, top, w, h);
    g.fillStyle = grad;
    g.fillRect(x, top, w, h);
    // gilt bands
    g.fillStyle = "rgba(214,178,98,0.9)";
    for (const f of [0.07, 0.11, 0.89, 0.93])
      g.fillRect(x + w * 0.1, top + h * f, w * 0.8, Math.max(1, h * 0.012));
    // title, rotated to read top-to-bottom
    g.save();
    g.translate(x + w / 2, top + h * 0.15);
    g.rotate(Math.PI / 2);
    const len = h * 0.7;
    let px = w * 0.42;
    g.font = font(px, { bold: true });
    while (g.measureText(s.title).width > len && px > w * 0.26) {
      px *= 0.93;
      g.font = font(px, { bold: true });
    }
    g.fillStyle = "#e2c98e";
    g.textBaseline = "middle";
    g.textAlign = "left";
    g.fillText(
      ellipsize(s.title, len, (t) => g.measureText(t).width),
      0,
      0,
    );
    g.restore();
  }
  return finish(cv);
}

let shared: { wall: CanvasTexture; glow: CanvasTexture } | null = null;

/** Lazily created, shared by every hallway (never disposed — they're tiny). */
export function sharedTextures() {
  if (!shared) shared = { wall: wallGradientTexture(), glow: glowTexture() };
  return shared;
}
