import { describe, expect, it } from "vitest";
import { ellipsize, wrapText } from "./textLayout";

// One unit per character keeps the arithmetic obvious.
const measure = (s: string) => s.length;

describe("text layout for labels and wall text", () => {
  it("wraps on word boundaries within the width", () => {
    const lines = wrapText("the quick brown fox jumps over the lazy dog", 15, measure);
    expect(lines).toEqual(["the quick brown", "fox jumps over", "the lazy dog"]);
    for (const l of lines) expect(measure(l)).toBeLessThanOrEqual(15);
  });

  it("caps the line count and marks the cut with an ellipsis", () => {
    const lines = wrapText("the quick brown fox jumps over the lazy dog", 15, measure, 2);
    expect(lines).toHaveLength(2);
    expect(lines[1].endsWith("…")).toBe(true);
    expect(measure(lines[1])).toBeLessThanOrEqual(15);
  });

  it("ellipsizes a single word that can't fit", () => {
    expect(ellipsize("Pneumonoultramicroscopic", 10, measure)).toBe("Pneumonou…");
    expect(wrapText("Pneumonoultramicroscopic", 10, measure)).toEqual(["Pneumonou…"]);
  });

  it("leaves text that fits alone", () => {
    expect(wrapText("Beetles", 20, measure)).toEqual(["Beetles"]);
    expect(wrapText("", 20, measure)).toEqual([]);
  });
});
