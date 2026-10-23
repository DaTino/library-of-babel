import { describe, expect, it } from "vitest";
import {
  FLOOR_TO_FLOOR,
  STAIR_START,
  doorAngle,
  floorClimbLength,
  landingAngle,
  stairHeight,
  stairSteps,
} from "./stairs";
import { wallTransform } from "./hexagon";

describe("spiral stair (§2.6)", () => {
  it("puts each floor's landing at that floor's height", () => {
    for (const level of [0, 1, 2]) {
      expect(stairHeight(landingAngle(level))).toBeCloseTo(level * FLOOR_TO_FLOOR);
    }
  });

  it("rises continuously and never descends", () => {
    let prev = stairHeight(landingAngle(0));
    for (let phi = landingAngle(0); phi <= landingAngle(2); phi += 0.01) {
      const y = stairHeight(phi);
      expect(y).toBeGreaterThanOrEqual(prev - 1e-9);
      expect(y - prev).toBeLessThan(0.05); // no jumps
      prev = y;
    }
  });

  it("alternates the doorway by half a turn, always facing an atrium doorway", () => {
    expect(doorAngle(0)).toBeCloseTo(STAIR_START);
    expect(doorAngle(1)).toBeCloseTo(STAIR_START + Math.PI);
    expect(doorAngle(2)).toBeCloseTo(STAIR_START);
    // wall midpoints sit at 30° + 60°·i
    const midpoints = [0, 1, 2, 3, 4, 5].map((i) => {
      const t = wallTransform(i);
      return Math.atan2(t.position[2], t.position[0]);
    });
    for (const level of [0, 1, 2]) {
      const a = doorAngle(level);
      expect(midpoints.some((m) => Math.abs(Math.sin(m - a)) < 1e-9 && Math.cos(m - a) > 0)).toBe(
        true,
      );
    }
  });

  it("lays treads from the ground landing to the top landing", () => {
    const steps = stairSteps(2);
    expect(steps[0].top).toBeCloseTo(0);
    expect(steps[steps.length - 1].top).toBeCloseTo(2 * FLOOR_TO_FLOOR);
    for (let i = 1; i < steps.length; i++)
      expect(steps[i].top).toBeGreaterThanOrEqual(steps[i - 1].top);
  });

  it("keeps a one-floor climb a short walk", () => {
    expect(floorClimbLength()).toBeGreaterThan(FLOOR_TO_FLOOR);
    expect(floorClimbLength()).toBeLessThan(25);
  });
});
