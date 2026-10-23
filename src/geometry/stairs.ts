/**
 * The spiral stair tower (§2.6 / Q13). A cylindrical tower stands at the center
 * of every atrium and runs the full height of the museum; inside it, one
 * continuous helix of steps climbs from the ground floor to the top. Floors are
 * stacked for real (the tower is Euclidean), so a climb can render both atria at
 * once and simply re-base the coordinates when it's over.
 *
 * Angles are "unwrapped" around the tower axis and absolute for the whole tower:
 * the ground floor's landing is at φ = STAIR_START, and each floor up adds 1.5
 * turns. World
 * position for angle φ at radius r is (r·cos φ, ·, r·sin φ) — the same convention
 * as the hexagon walls.
 */

/** Vertical distance between consecutive floors (atrium ceiling 4.5 m + slab). */
export const FLOOR_TO_FLOOR = 8;
export const STAIR_TURNS_PER_FLOOR = 1.5;
const FLOOR_ANGLE = STAIR_TURNS_PER_FLOOR * Math.PI * 2;

/** Angular size of one step, and of half the flat landing at each floor. */
export const STEP_ANGLE = Math.PI / 12; // 15°
const LANDING_HALF = STEP_ANGLE;

export const TOWER_RADIUS = 2.9; // outer face of the tower wall
export const TOWER_INNER_RADIUS = 2.75;
export const COLUMN_RADIUS = 0.55;
/** Where the camera walks on the stair (between the column and the wall). */
export const STAIR_PATH_RADIUS = 1.75;
/** Half-angle of the tower doorway (≈1.8 m wide) and its height. */
export const TOWER_DOOR_HALF_ANGLE = 0.32;
export const TOWER_DOOR_HEIGHT = 3;

/** The ground floor's landing angle. 30° puts every tower doorway (floors
 *  alternate by half a turn: 30°, 210°, …) facing a wall midpoint — i.e. one of
 *  the atrium's signed hallway doors — so stepping off the stair you face a way
 *  onward, not a blank corner. */
export const STAIR_START = Math.PI / 6;

/** Unwrapped angle of the doorway + landing on floor `level`. */
export function landingAngle(level: number): number {
  return STAIR_START + level * FLOOR_ANGLE;
}

/** The same angle wrapped to [0, 2π) — where the doorway sits in the atrium. */
export function doorAngle(level: number): number {
  const a = landingAngle(level) % (Math.PI * 2);
  return a < 0 ? a + Math.PI * 2 : a;
}

/**
 * Height of the (smoothed) stair surface at unwrapped angle φ, measured from the
 * ground floor. Each floor has a flat landing of ±15° around its doorway; between
 * landings the stair rises evenly by one floor.
 */
export function stairHeight(phi: number): number {
  const p = phi - STAIR_START;
  const k = Math.floor((p + LANDING_HALF) / FLOOR_ANGLE);
  const local = p - k * FLOOR_ANGLE;
  const rise = FLOOR_ANGLE - 2 * LANDING_HALF;
  const y = local <= LANDING_HALF ? 0 : ((local - LANDING_HALF) / rise) * FLOOR_TO_FLOOR;
  return k * FLOOR_TO_FLOOR + y;
}

export interface Step {
  /** Mid-angle of the tread. */
  phi: number;
  /** Height of the tread's top surface (from the ground floor). */
  top: number;
}

/** Every tread from the ground landing to the top landing (`topLevel`). */
export function stairSteps(topLevel: number): Step[] {
  const steps: Step[] = [];
  const start = landingAngle(0) - LANDING_HALF;
  const end = landingAngle(topLevel) + LANDING_HALF;
  const n = Math.round((end - start) / STEP_ANGLE);
  for (let i = 0; i < n; i++) {
    const a = start + i * STEP_ANGLE;
    // Stepping onto a tread lands you at the height of its upper edge.
    steps.push({ phi: a + STEP_ANGLE / 2, top: stairHeight(a + STEP_ANGLE - 1e-6) });
  }
  return steps;
}

/** Path length (m) of a one-floor climb along the walking line. */
export function floorClimbLength(): number {
  const horizontal = STAIR_PATH_RADIUS * FLOOR_ANGLE;
  return Math.hypot(horizontal, FLOOR_TO_FLOOR);
}
