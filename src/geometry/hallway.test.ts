import { describe, expect, it } from "vitest";
import {
  DOOR_WIDTH,
  EXHIBIT_SLOTS,
  HALL_JOG,
  HALL_LEG,
  HALL_LENGTH,
  HALL_WALLS,
  HALL_WIDTH,
  SWAP_MARGIN,
  doorFrame,
  flipEnds,
  hallProgress,
  inHallway,
  shouldSwap,
  swapPose,
  toLocal,
  toWorld,
  type Local,
} from "./hallway";
import { PLAYER_RADIUS } from "./hexagon";

const H = HALL_WIDTH / 2;

/** Do segments ab and cd properly cross (not just touch at an end)? */
function crosses(a: Local, b: Local, c: Local, d: Local): boolean {
  const cross = (p: Local, q: Local, r: Local) =>
    (q.x - p.x) * (r.z - p.z) - (q.z - p.z) * (r.x - p.x);
  const d1 = cross(c, d, a);
  const d2 = cross(c, d, b);
  const d3 = cross(a, b, c);
  const d4 = cross(a, b, d);
  return d1 * d2 < 0 && d3 * d4 < 0;
}
const blocked = (eye: Local, target: Local) =>
  HALL_WALLS.some(([c, d]) => crosses(eye, target, c, d));

describe("hallway geometry (§2.7)", () => {
  it("is 25 m door to door, with the midpoint in the middle of the jog", () => {
    expect(HALL_LENGTH).toBe(25);
    expect(hallProgress({ x: 0, z: 0 })).toBeCloseTo(0);
    expect(hallProgress({ x: HALL_JOG / 2, z: -HALL_LEG })).toBeCloseTo(HALL_LENGTH / 2);
    expect(hallProgress({ x: HALL_JOG, z: -2 * HALL_LEG })).toBeCloseTo(HALL_LENGTH);
  });

  it("flipping ends is a point reflection: involutive, door A ↔ door B", () => {
    const p = { x: 1.3, z: -6.2 };
    const back = flipEnds(flipEnds(p));
    expect(back.x).toBeCloseTo(p.x);
    expect(back.z).toBeCloseTo(p.z);
    expect(flipEnds({ x: 0, z: 0 })).toEqual({ x: HALL_JOG, z: -2 * HALL_LEG });
    // progress measured from the other end is the complement
    expect(hallProgress(flipEnds(p))).toBeCloseTo(HALL_LENGTH - hallProgress(p));
  });

  it("the outline is symmetric, so the hallway looks the same from either end", () => {
    const key = (p: Local) => `${p.x.toFixed(3)},${p.z.toFixed(3)}`;
    const walls = new Set(HALL_WALLS.map(([a, b]) => [key(a), key(b)].sort().join("|")));
    for (const [a, b] of HALL_WALLS) {
      const flipped = [key(flipEnds(a)), key(flipEnds(b))].sort().join("|");
      expect(walls.has(flipped)).toBe(true);
    }
  });

  it("swaps only past the midpoint (with hysteresis on both sides)", () => {
    const mid = HALL_JOG / 2;
    expect(shouldSwap({ x: mid, z: -HALL_LEG })).toBe(false);
    expect(shouldSwap({ x: mid + SWAP_MARGIN + 0.05, z: -HALL_LEG })).toBe(true);
    // Right after a swap we're just short of the far side's threshold.
    const after = flipEnds({ x: mid + SWAP_MARGIN + 0.05, z: -HALL_LEG });
    expect(shouldSwap(after)).toBe(false);
  });

  it("neither doorway is visible from anywhere in the hand-over zone", () => {
    const mid = HALL_JOG / 2;
    const margin = PLAYER_RADIUS; // the visitor can't stand closer to a wall
    const doorA = (t: number): Local => ({ x: (t - 0.5) * DOOR_WIDTH, z: 0 });
    const doorB = (t: number): Local => flipEnds(doorA(t));
    for (const dx of [-SWAP_MARGIN, 0, SWAP_MARGIN]) {
      for (const z of [-HALL_LEG - H + margin, -HALL_LEG, -HALL_LEG + H - margin]) {
        const eye = { x: mid + dx, z };
        for (let i = 0; i <= 10; i++) {
          expect(blocked(eye, doorA(i / 10))).toBe(true);
          expect(blocked(eye, doorB(i / 10))).toBe(true);
        }
      }
    }
  });

  it("re-expresses a pose in the far room's frame and back again exactly", () => {
    const from = doorFrame(1);
    const to = doorFrame(5);
    const p = toWorld(from, { x: HALL_JOG / 2 + 0.6, z: -HALL_LEG + 0.3 });
    const there = swapPose(from, to, p.x, p.z);
    const back = swapPose(to, from, there.x, there.z);
    expect(back.x).toBeCloseTo(p.x);
    expect(back.z).toBeCloseTo(p.z);
    const turn = (there.dYaw + back.dYaw) % (2 * Math.PI);
    expect(Math.abs(Math.sin(turn))).toBeLessThan(1e-9);
    // …and it's the same hallway spot seen from the other door.
    const l = toLocal(to, there.x, there.z);
    const expected = flipEnds(toLocal(from, p.x, p.z));
    expect(l.x).toBeCloseTo(expected.x);
    expect(l.z).toBeCloseTo(expected.z);
  });

  it("hangs 6 plates and 2 cases, symmetric end to end, all inside the corridor", () => {
    expect(EXHIBIT_SLOTS).toHaveLength(8);
    expect(EXHIBIT_SLOTS.filter((s) => s.display === "plate")).toHaveLength(6);
    expect(EXHIBIT_SLOTS.filter((s) => s.display === "case")).toHaveLength(2);
    const key = (s: Local) => `${s.x.toFixed(3)},${s.z.toFixed(3)}`;
    const all = new Set(EXHIBIT_SLOTS.map(key));
    for (const s of EXHIBIT_SLOTS) {
      expect(inHallway(s)).toBe(true);
      expect(all.has(key(flipEnds(s)))).toBe(true);
    }
  });
});
