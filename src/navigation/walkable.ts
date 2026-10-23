import type { Room } from "../model/types";
import { MAX_WALK_RADIUS, PLAYER_RADIUS } from "../geometry/hexagon";
import {
  CASE_POINTS,
  CASE_RADIUS,
  doorFrame,
  hallWalkSegments,
  toWorld,
} from "../geometry/hallway";
import { TOWER_DOOR_HALF_ANGLE, TOWER_RADIUS, doorAngle } from "../geometry/stairs";

/**
 * Where the visitor may stand (§2.7). A room's walkable area is a union of simple
 * shapes — the room floor (a disk, or a ring around the atrium's stair tower),
 * each doorway passage, and each hallway's three legs (capsules) — minus a few
 * blocked circles (the hallway display cases). Movement is clamped to it.
 */
export type Shape =
  | { kind: "disk"; x: number; z: number; r: number }
  | { kind: "ring"; x: number; z: number; rIn: number; rOut: number }
  | { kind: "capsule"; ax: number; az: number; bx: number; bz: number; r: number };

export interface Circle {
  x: number;
  z: number;
  r: number;
}

export interface WalkArea {
  allow: Shape[];
  block: Circle[];
}

const EPS = 1e-4;
/** Half-diagonal of a themed room's centrepiece case (1.3 m square). */
const CENTREPIECE_RADIUS = 0.92;

/** The current room's walkable area — set by the Scene (in the commit that swaps
 *  rooms), read every frame by the player controller. */
export const activeWalkArea: { current: WalkArea | null } = { current: null };

function closestOnSegment(s: Extract<Shape, { kind: "capsule" }>, x: number, z: number) {
  const vx = s.bx - s.ax;
  const vz = s.bz - s.az;
  const len2 = vx * vx + vz * vz || 1;
  const t = Math.max(0, Math.min(1, ((x - s.ax) * vx + (z - s.az) * vz) / len2));
  return { x: s.ax + vx * t, z: s.az + vz * t };
}

export function inShape(s: Shape, x: number, z: number): boolean {
  if (s.kind === "disk") return Math.hypot(x - s.x, z - s.z) <= s.r + EPS;
  if (s.kind === "ring") {
    const d = Math.hypot(x - s.x, z - s.z);
    return d >= s.rIn - EPS && d <= s.rOut + EPS;
  }
  const c = closestOnSegment(s, x, z);
  return Math.hypot(x - c.x, z - c.z) <= s.r + EPS;
}

/** Nearest point inside `s` to (x, z). */
export function closestInShape(s: Shape, x: number, z: number): { x: number; z: number } {
  if (inShape(s, x, z)) return { x, z };
  if (s.kind === "capsule") {
    const c = closestOnSegment(s, x, z);
    const d = Math.hypot(x - c.x, z - c.z) || 1;
    return { x: c.x + ((x - c.x) / d) * s.r, z: c.z + ((z - c.z) / d) * s.r };
  }
  const dx = x - s.x;
  const dz = z - s.z;
  const d = Math.hypot(dx, dz) || 1;
  const r = s.kind === "disk" ? s.r : d < s.rIn ? s.rIn : s.rOut;
  return { x: s.x + (dx / d) * r, z: s.z + (dz / d) * r };
}

export function isWalkable(area: WalkArea, x: number, z: number): boolean {
  if (!area.allow.some((s) => inShape(s, x, z))) return false;
  return !area.block.some((b) => Math.hypot(x - b.x, z - b.z) < b.r - EPS);
}

/**
 * Clamp a desired position into the walkable area, sliding along its edges. Falls
 * back to the previous position if no nearby walkable point is found.
 */
export function clampToWalkArea(
  area: WalkArea,
  x: number,
  z: number,
  prevX: number,
  prevZ: number,
): { x: number; z: number } {
  if (isWalkable(area, x, z)) return { x, z };

  let best: { x: number; z: number } | null = null;
  let bestD = Infinity;
  for (const s of area.allow) {
    let p = closestInShape(s, x, z);
    for (const b of area.block) {
      const dx = p.x - b.x;
      const dz = p.z - b.z;
      const d = Math.hypot(dx, dz);
      if (d < b.r) {
        const k = (b.r + EPS) / (d || 1);
        p = { x: b.x + dx * k, z: b.z + dz * k };
      }
    }
    if (!isWalkable(area, p.x, p.z)) continue;
    const d = Math.hypot(p.x - x, p.z - z);
    if (d < bestD) {
      bestD = d;
      best = p;
    }
  }
  return best ?? { x: prevX, z: prevZ };
}

/** The walkable area of a room in its own frame, including its hallways. */
export function roomWalkArea(room: Room): WalkArea {
  const allow: Shape[] = [];
  const block: Circle[] = [];

  if (room.kind === "atrium") {
    // Walk around the central stair tower, and step into its doorway (§2.6).
    allow.push({
      kind: "ring",
      x: 0,
      z: 0,
      rIn: TOWER_RADIUS + PLAYER_RADIUS,
      rOut: MAX_WALK_RADIUS,
    });
    const a = doorAngle(room.floorLevel);
    const doorHalf = TOWER_RADIUS * Math.sin(TOWER_DOOR_HALF_ANGLE);
    const rOuter = TOWER_RADIUS + PLAYER_RADIUS + 0.4;
    const rInner = TOWER_RADIUS - 0.05;
    allow.push({
      kind: "capsule",
      ax: rOuter * Math.cos(a),
      az: rOuter * Math.sin(a),
      bx: rInner * Math.cos(a),
      bz: rInner * Math.sin(a),
      r: Math.max(0.2, doorHalf - PLAYER_RADIUS),
    });
  } else {
    allow.push({ kind: "disk", x: 0, z: 0, r: MAX_WALK_RADIUS });
    // The centrepiece's glass case (1.3 m square) stands in the middle.
    if (room.centerpiece) block.push({ x: 0, z: 0, r: CENTREPIECE_RADIUS + PLAYER_RADIUS });
  }

  for (const exit of room.exits) {
    if (exit.kind !== "doorway" || exit.wallIndex === undefined) continue;
    const f = doorFrame(exit.wallIndex);
    for (const seg of hallWalkSegments(PLAYER_RADIUS)) {
      const a = toWorld(f, seg.a);
      const b = toWorld(f, seg.b);
      allow.push({ kind: "capsule", ax: a.x, az: a.z, bx: b.x, bz: b.z, r: seg.r });
    }
    for (const c of CASE_POINTS) {
      const w = toWorld(f, c);
      block.push({ x: w.x, z: w.z, r: CASE_RADIUS + PLAYER_RADIUS });
    }
  }

  return { allow, block };
}
