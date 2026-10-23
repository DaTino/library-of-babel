import { describe, expect, it } from "vitest";
import { museum } from "../data/placeholder";
import { roomsById } from "../model/deriveMuseum";
import { APOTHEM, MAX_WALK_RADIUS } from "../geometry/hexagon";
import {
  CASE_POINTS,
  HALL_JOG,
  HALL_LEG,
  HALL_OUTLINE,
  HALL_WIDTH,
  doorFrame,
  toWorld,
  type Local,
} from "../geometry/hallway";
import { TOWER_RADIUS, doorAngle } from "../geometry/stairs";
import { clampToWalkArea, isWalkable, roomWalkArea } from "./walkable";

const rooms = roomsById(museum);
const egypt = rooms.get("floor-1:egypt")!;
const atrium = rooms.get("floor-1:atrium")!;

function segDist(a: Local, b: Local, c: Local, d: Local): number {
  const pt = (p: Local, s: Local, e: Local) => {
    const vx = e.x - s.x;
    const vz = e.z - s.z;
    const t = Math.max(0, Math.min(1, ((p.x - s.x) * vx + (p.z - s.z) * vz) / (vx * vx + vz * vz)));
    return Math.hypot(s.x + vx * t - p.x, s.z + vz * t - p.z);
  };
  return Math.min(pt(a, c, d), pt(b, c, d), pt(c, a, b), pt(d, a, b));
}

const CENTERLINE: [Local, Local][] = [
  [
    { x: 0, z: 0 },
    { x: 0, z: -HALL_LEG },
  ],
  [
    { x: 0, z: -HALL_LEG },
    { x: HALL_JOG, z: -HALL_LEG },
  ],
  [
    { x: HALL_JOG, z: -HALL_LEG },
    { x: HALL_JOG, z: -2 * HALL_LEG },
  ],
];

describe("walkable area (§2.7)", () => {
  it("lets you walk from a room through its doorway and down the hallway", () => {
    const area = roomWalkArea(egypt);
    const f = doorFrame(egypt.exits[0].wallIndex!);
    // A path that steps around the display case in the first leg.
    const path: Local[] = [
      { x: 0, z: 2.5 },
      { x: 0, z: 0 },
      { x: 0, z: -1.5 },
      { x: 1.1, z: -3 },
      { x: 1.1, z: -6 },
      { x: 0, z: -HALL_LEG },
      { x: HALL_JOG / 2, z: -HALL_LEG },
    ];
    for (const p of path) {
      const w = toWorld(f, p);
      expect(isWalkable(area, w.x, w.z), `(${p.x}, ${p.z})`).toBe(true);
    }
  });

  it("keeps you out of the walls beside a doorway, beyond the hexagon, and out of cases", () => {
    const area = roomWalkArea(egypt);
    const f = doorFrame(egypt.exits[0].wallIndex!);
    const besideDoor = toWorld(f, { x: 1.4, z: -0.2 });
    expect(isWalkable(area, besideDoor.x, besideDoor.z)).toBe(false);
    const art = egypt.artWalls[0].wallIndex;
    const beyondArtWall = toWorld(doorFrame(art), { x: 0, z: -0.5 });
    expect(isWalkable(area, beyondArtWall.x, beyondArtWall.z)).toBe(false);
    for (const c of CASE_POINTS) {
      const w = toWorld(f, c);
      expect(isWalkable(area, w.x, w.z)).toBe(false);
    }
  });

  it("slides you along the edge instead of letting you through", () => {
    const area = roomWalkArea(egypt);
    const p = clampToWalkArea(area, 0, -APOTHEM, 0, -1);
    // Wall 4's midpoint direction is solid art wall: you stop inside the room.
    expect(Math.hypot(p.x, p.z)).toBeLessThanOrEqual(MAX_WALK_RADIUS + 1e-3);
  });

  it("walls off the atrium's stair tower except its doorway", () => {
    const area = roomWalkArea(atrium);
    expect(isWalkable(area, 0, 0)).toBe(false);
    expect(isWalkable(area, 0, 4.2)).toBe(true);
    const a = doorAngle(atrium.floorLevel);
    const r = TOWER_RADIUS + 0.1;
    expect(isWalkable(area, r * Math.cos(a), r * Math.sin(a))).toBe(true);
    const b = a + Math.PI / 2;
    expect(isWalkable(area, r * Math.cos(b), r * Math.sin(b))).toBe(false);
  });

  it("never lets two hallways off the same room overlap (in that room's frame)", () => {
    for (const room of rooms.values()) {
      const doors = room.exits.filter((e) => e.kind === "doorway" && e.wallIndex !== undefined);
      const lines = doors.map((e) => {
        const f = doorFrame(e.wallIndex!);
        return CENTERLINE.map(([a, b]) => [toWorld(f, a), toWorld(f, b)] as [Local, Local]);
      });
      for (let i = 0; i < lines.length; i++) {
        for (let j = i + 1; j < lines.length; j++) {
          let min = Infinity;
          for (const [a, b] of lines[i])
            for (const [c, d] of lines[j]) min = Math.min(min, segDist(a, b, c, d));
          expect(min, `${room.id}: hallways ${i} & ${j}`).toBeGreaterThan(HALL_WIDTH + 0.5);
        }
      }
    }
  });

  it("keeps every hallway outside its room's hexagon", () => {
    for (const room of [egypt, atrium]) {
      for (const e of room.exits) {
        if (e.wallIndex === undefined) continue;
        const f = doorFrame(e.wallIndex);
        for (const v of HALL_OUTLINE) {
          const w = toWorld(f, v);
          expect(Math.hypot(w.x, w.z)).toBeGreaterThanOrEqual(APOTHEM - 1e-6);
        }
      }
    }
  });
});
