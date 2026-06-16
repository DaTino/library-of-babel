import { describe, expect, it } from "vitest";
import { hashString, mulberry32, sample } from "./seededRandom";

describe("seededRandom", () => {
  it("hashString is deterministic and varies by input", () => {
    expect(hashString("abc")).toBe(hashString("abc"));
    expect(hashString("abc")).not.toBe(hashString("abd"));
  });

  it("mulberry32 yields a deterministic sequence in [0,1)", () => {
    const a = mulberry32(42);
    const b = mulberry32(42);
    const seq = [a(), a(), a()];
    expect(seq).toEqual([b(), b(), b()]);
    for (const n of seq) {
      expect(n).toBeGreaterThanOrEqual(0);
      expect(n).toBeLessThan(1);
    }
  });

  const pool = Array.from({ length: 10 }, (_, i) => `item-${i}`);

  it("samples the requested count, deterministically per seed", () => {
    expect(sample(pool, "shelf-1", 4)).toEqual(sample(pool, "shelf-1", 4));
    expect(sample(pool, "shelf-1", 4)).toHaveLength(4);
  });

  it("returns distinct items when the pool is large enough", () => {
    const picks = sample(pool, "shelf-2", 4);
    expect(new Set(picks).size).toBe(4);
  });

  it("different seeds generally differ; empty pool yields nothing", () => {
    expect(sample(pool, "a", 4)).not.toEqual(sample(pool, "z", 4));
    expect(sample([], "a", 4)).toEqual([]);
  });

  it("cycles (with repeats) when the pool is smaller than count", () => {
    expect(sample(["x", "y"], "s", 5)).toHaveLength(5);
  });
});
