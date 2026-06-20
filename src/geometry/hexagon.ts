/**
 * Hexagonal room geometry (§3.1). A single parameterized shell is reused for
 * every room (§6.1). Wall index convention: art on even {0,2,4}, exits on odd
 * {1,3,5}. Vertices sit at world XZ angles 0°,60°,…; each wall spans two
 * adjacent vertices and its midpoint sits on the apothem circle.
 */

export const HEX_RADIUS = 6.5; // circumradius (m); for a regular hexagon, side length = radius
export const WALL_HEIGHT = 4.5; // §3.1 "moderate height (~4–5 m)"
export const EYE_HEIGHT = 2.2;
export const APOTHEM = HEX_RADIUS * Math.cos(Math.PI / 6); // center → wall midpoint
export const PLAYER_RADIUS = 0.45; // keep-out margin from the walls
export const MAX_WALK_RADIUS = APOTHEM - PLAYER_RADIUS;

export const ART_WALL_INDICES = [0, 2, 4] as const;
export const EXIT_WALL_INDICES = [1, 3, 5] as const;

export interface WallTransform {
  /** Wall midpoint at floor level (y = 0). */
  position: [number, number, number];
  /** Y-rotation so a plane's local +Z normal points at the room center. */
  rotationY: number;
  /** Wall width (= hexagon side length). */
  width: number;
}

export function wallTransform(index: number, radius = HEX_RADIUS): WallTransform {
  const apothem = radius * Math.cos(Math.PI / 6);
  const phi = ((index * 60 + 30) * Math.PI) / 180; // wall-midpoint angle
  return {
    position: [apothem * Math.cos(phi), 0, apothem * Math.sin(phi)],
    rotationY: Math.atan2(-Math.cos(phi), -Math.sin(phi)),
    width: 2 * radius * Math.sin(Math.PI / 6), // = radius
  };
}

export function isArtWall(index: number): boolean {
  return index % 2 === 0;
}
