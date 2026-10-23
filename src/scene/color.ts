/** Multiply a #rrggbb color by `k` (darken < 1, lighten > 1), clamped. */
export function shade(hex: string, k: number): string {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return hex;
  const n = parseInt(m[1], 16);
  const ch = (shift: number) =>
    Math.max(0, Math.min(255, Math.round(((n >> shift) & 255) * k)))
      .toString(16)
      .padStart(2, "0");
  return `#${ch(16)}${ch(8)}${ch(0)}`;
}
