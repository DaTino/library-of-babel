/**
 * Live, per-frame climb values shared between the climb animation and the
 * lighting (§2.6) — kept out of React state so they can change every frame.
 * `light` crossfades the two atria's key lights (0 = all origin, 1 = all
 * destination) while the visitor is inside the tower, out of sight of both.
 * `steppedOff` marks an arrival by the stair, so the doorway we're standing in
 * doesn't immediately start another climb.
 */
export const climbState = { light: 0, steppedOff: false };
