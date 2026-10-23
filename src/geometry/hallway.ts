import { wallTransform } from "./hexagon";
import type { ExhibitDisplay } from "../model/types";

/**
 * Hallway geometry (§2.7). Every doorway opens onto a Z-shaped corridor: a
 * straight leg out from the door, a jog to the right, and a second straight leg
 * to the far door. The shape is point-symmetric about its midpoint, so it looks
 * identical from either end — which is what lets it live in *both* rooms'
 * coordinate frames. At the middle of the jog neither doorway is in view, and
 * that's where the visitor's frame is swapped from one room to the other.
 *
 * Coordinates here are "door-local": origin at the doorway's wall midpoint on the
 * floor, +Z pointing back into the room, −Z heading out down the corridor, and
 * +X to the visitor's right as they walk out (the jog turns right).
 */

export const DOOR_WIDTH = 1.8;
export const DOOR_HEIGHT = 3;

export const HALL_WIDTH = 3.6;
export const HALL_HEIGHT = 3.6;
/** Door plane → centerline of the middle leg (both long legs are this long). */
export const HALL_LEG = 9;
/** Sideways offset of the middle leg (the "jog"), to the right walking in. */
export const HALL_JOG = 7;
/** Length along the centerline, door to door (25 m ≈ 8 s at walking pace). */
export const HALL_LENGTH = 2 * HALL_LEG + HALL_JOG;
/** Hysteresis either side of the midpoint, so the frame swap can't flicker. */
export const SWAP_MARGIN = 0.45;

const H = HALL_WIDTH / 2;

export interface Local {
  x: number;
  z: number;
}

/** A doorway's placement in its room: wall midpoint + yaw (local → world). */
export interface Frame {
  x: number;
  z: number;
  rot: number;
}

/** The Z-shaped corridor outline (floor polygon), in door-local coordinates. */
export const HALL_OUTLINE: Local[] = [
  { x: -H, z: 0 },
  { x: -H, z: -HALL_LEG - H },
  { x: HALL_JOG - H, z: -HALL_LEG - H },
  { x: HALL_JOG - H, z: -2 * HALL_LEG },
  { x: HALL_JOG + H, z: -2 * HALL_LEG },
  { x: HALL_JOG + H, z: -HALL_LEG + H },
  { x: H, z: -HALL_LEG + H },
  { x: H, z: 0 },
];

/** Wall segments of the outline — every edge except the two open door ends. */
export const HALL_WALLS: [Local, Local][] = [0, 1, 2, 4, 5, 6].map((i) => [
  HALL_OUTLINE[i],
  HALL_OUTLINE[i + 1],
]);

/** The centerline, door to door, as three segments. */
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

export function doorFrame(wallIndex: number): Frame {
  const t = wallTransform(wallIndex);
  return { x: t.position[0], z: t.position[2], rot: t.rotationY };
}

/** World (room frame) → door-local. */
export function toLocal(f: Frame, wx: number, wz: number): Local {
  const dx = wx - f.x;
  const dz = wz - f.z;
  const c = Math.cos(f.rot);
  const s = Math.sin(f.rot);
  return { x: dx * c - dz * s, z: dx * s + dz * c };
}

/** Door-local → world (room frame). Matches a three.js group at the door. */
export function toWorld(f: Frame, l: Local): Local {
  const c = Math.cos(f.rot);
  const s = Math.sin(f.rot);
  return { x: f.x + l.x * c + l.z * s, z: f.z - l.x * s + l.z * c };
}

/** The same physical point, seen from the hallway's other end (180° about the
 *  midpoint). Applying it twice is the identity. */
export function flipEnds(l: Local): Local {
  return { x: HALL_JOG - l.x, z: -2 * HALL_LEG - l.z };
}

/** True when a door-local point is inside the corridor (past the door plane). */
export function inHallway(l: Local): boolean {
  if (l.z > 0) return false;
  const leg1 = Math.abs(l.x) <= H && l.z >= -HALL_LEG - H;
  const jog = l.z >= -HALL_LEG - H && l.z <= -HALL_LEG + H && l.x >= -H && l.x <= HALL_JOG + H;
  const leg2 = Math.abs(l.x - HALL_JOG) <= H && l.z >= -2 * HALL_LEG && l.z <= -HALL_LEG + H;
  return leg1 || jog || leg2;
}

/** Metres walked along the centerline from this end's door (0…HALL_LENGTH). */
export function hallProgress(l: Local): number {
  let best = Infinity;
  let progress = 0;
  let offset = 0;
  for (const [a, b] of CENTERLINE) {
    const vx = b.x - a.x;
    const vz = b.z - a.z;
    const len = Math.hypot(vx, vz);
    const t = Math.max(0, Math.min(1, ((l.x - a.x) * vx + (l.z - a.z) * vz) / (len * len)));
    const d = Math.hypot(a.x + vx * t - l.x, a.z + vz * t - l.z);
    if (d < best) {
      best = d;
      progress = offset + t * len;
    }
    offset += len;
  }
  return progress;
}

/** Past the midpoint (plus hysteresis): time to hand over to the far room. */
export function shouldSwap(l: Local): boolean {
  return inHallway(l) && hallProgress(l) > HALL_LENGTH / 2 + SWAP_MARGIN;
}

/**
 * Re-express a pose in the far room's frame (§2.7): world-in-A → door-local A →
 * flip ends → door-local B → world-in-B. Returns the new position and the yaw
 * to add to the camera (rotation about world +Y).
 */
export function swapPose(
  from: Frame,
  to: Frame,
  x: number,
  z: number,
): { x: number; z: number; dYaw: number } {
  const w = toWorld(to, flipEnds(toLocal(from, x, z)));
  return { x: w.x, z: w.z, dYaw: to.rot + Math.PI - from.rot };
}

// --- Exhibit + fixture placement (§9.1) -------------------------------------
// Authored from the hallway's canonical end (ends[0]). The second half is the
// point-reflection of the first, so both ends get the same rhythm: a plate on
// each wall, a display case down the middle, and a plate closing the view at the
// end of the leg.

export interface Slot extends Local {
  /** Yaw of the item's facing (+Z normal rotated about Y). */
  rot: number;
}

export interface ExhibitSlot extends Slot {
  display: ExhibitDisplay;
}

const INSET = 0.05; // plates sit just proud of the wall

const flipSlot = <T extends Slot>(s: T): T => ({ ...s, ...flipEnds(s), rot: s.rot + Math.PI });

const FIRST_HALF: ExhibitSlot[] = [
  { display: "plate", x: -H + INSET, z: -3.0, rot: Math.PI / 2 },
  { display: "plate", x: H - INSET, z: -5.4, rot: -Math.PI / 2 },
  { display: "case", x: 0, z: -4.2, rot: 0 },
  { display: "plate", x: 0, z: -HALL_LEG - H + INSET, rot: 0 },
];

/** Eight exhibits: 6 wall plates + 2 display cases (§9.1). */
export const EXHIBIT_SLOTS: ExhibitSlot[] = [
  ...FIRST_HALF,
  ...[3, 0, 1, 2].map((i) => flipSlot(FIRST_HALF[i])),
];

/** Display-case footprint radius (for collision) and size. */
export const CASE_RADIUS = 0.5;

/** The hallway's name plaque, just inside each door on the left. */
const SIGN: Slot = { x: -H + INSET, z: -1.3, rot: Math.PI / 2 };
export const SIGN_SLOTS: Slot[] = [SIGN, flipSlot(SIGN)];

/** Ceiling lamps along the centerline (symmetric). */
export const LAMP_POINTS: Local[] = [
  { x: 0, z: -2.4 },
  { x: 0, z: -6.6 },
  { x: HALL_JOG / 2, z: -HALL_LEG },
  { x: HALL_JOG, z: -HALL_LEG - 2.4 },
  { x: HALL_JOG, z: -HALL_LEG - 6.6 },
];

/** Walkable capsules (door-local), for the player clamp (§2.7): the door passage
 *  (door-width) plus the three corridor legs (full width). Radii already exclude
 *  the player's radius. The far door's passage is omitted on purpose — the frame
 *  swaps to the far room long before the visitor reaches it. */
export function hallWalkSegments(playerRadius: number): { a: Local; b: Local; r: number }[] {
  const corridor = H - playerRadius;
  return [
    { a: { x: 0, z: 1.2 }, b: { x: 0, z: -1.6 }, r: DOOR_WIDTH / 2 - playerRadius },
    { a: { x: 0, z: -1.4 }, b: { x: 0, z: -HALL_LEG }, r: corridor },
    { a: { x: 0, z: -HALL_LEG }, b: { x: HALL_JOG, z: -HALL_LEG }, r: corridor },
    { a: { x: HALL_JOG, z: -HALL_LEG }, b: { x: HALL_JOG, z: -2 * HALL_LEG + 1.4 }, r: corridor },
  ];
}

/** Display-case positions (door-local) — the same set from either end. */
export const CASE_POINTS: Local[] = EXHIBIT_SLOTS.filter((s) => s.display === "case");
