/**
 * Pure text layout for canvas-drawn labels, spines and wall text (kept apart
 * from the canvas so it can be unit-tested). `measure` returns a string's width
 * in the same units as `maxWidth` (pixels, with the font already set).
 */
export type Measure = (text: string) => number;

/** Shorten `text` with a trailing "…" until it fits `maxWidth`. */
export function ellipsize(text: string, maxWidth: number, measure: Measure): string {
  if (measure(text) <= maxWidth) return text;
  let s = text;
  while (s.length > 1 && measure(`${s}…`) > maxWidth) s = s.slice(0, -1).trimEnd();
  return `${s}…`;
}

/**
 * Greedy word-wrap into at most `maxLines` lines. If the text doesn't fit, the
 * last line ends in "…"; a single word wider than the line is ellipsized too.
 */
export function wrapText(
  text: string,
  maxWidth: number,
  measure: Measure,
  maxLines = Infinity,
): string[] {
  const words = (text ?? "").split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let cur = "";
  for (const w of words) {
    const next = cur ? `${cur} ${w}` : w;
    if (!cur || measure(next) <= maxWidth) {
      cur = next;
    } else {
      lines.push(cur);
      cur = w;
    }
  }
  if (cur) lines.push(cur);

  if (lines.length > maxLines) {
    const kept = lines.slice(0, maxLines).map((l) => ellipsize(l, maxWidth, measure));
    let last = kept[maxLines - 1].replace(/…$/, "");
    while (last.length > 1 && measure(`${last}…`) > maxWidth) last = last.slice(0, -1).trimEnd();
    kept[maxLines - 1] = `${last}…`;
    return kept;
  }
  return lines.map((l) => ellipsize(l, maxWidth, measure));
}
