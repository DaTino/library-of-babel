import { describe, expect, it } from "vitest";
import { APOTHEM, ART_WALL_INDICES, EXIT_WALL_INDICES, isArtWall, wallTransform } from "./hexagon";

describe("hexagon geometry", () => {
  it("places every wall midpoint on the apothem circle", () => {
    for (let i = 0; i < 6; i++) {
      const t = wallTransform(i);
      const r = Math.hypot(t.position[0], t.position[2]);
      expect(r).toBeCloseTo(APOTHEM, 5);
    }
  });

  it("orients each wall so its local +Z normal points at the room center", () => {
    for (let i = 0; i < 6; i++) {
      const t = wallTransform(i);
      const nx = Math.sin(t.rotationY);
      const nz = Math.cos(t.rotationY);
      const r = Math.hypot(t.position[0], t.position[2]);
      const inwardX = -t.position[0] / r;
      const inwardZ = -t.position[2] / r;
      expect(nx * inwardX + nz * inwardZ).toBeCloseTo(1, 5);
    }
  });

  it("separates art walls (even) from exit walls (odd)", () => {
    expect([...ART_WALL_INDICES]).toEqual([0, 2, 4]);
    expect([...EXIT_WALL_INDICES]).toEqual([1, 3, 5]);
    expect(isArtWall(0)).toBe(true);
    expect(isArtWall(1)).toBe(false);
  });
});
