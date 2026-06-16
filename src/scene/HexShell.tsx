import { useMemo } from "react";
import { DoubleSide } from "three";
import type { RoomTheme } from "../model/types";
import {
  EXIT_WALL_INDICES,
  HEX_RADIUS,
  WALL_HEIGHT,
  wallTransform,
  type WallTransform,
} from "../geometry/hexagon";

const DOOR_W = 1.8;
const DOOR_H = 3;

/** The reusable hexagon shell (§6.1): floor, ceiling, and 6 walls. Exit walls
 *  are drawn as a frame with a central doorway opening. */
export function HexShell({ theme }: { theme: RoomTheme }) {
  const floorColor = theme.materials.floor ?? theme.palette[1] ?? "#888888";
  const wallColor = theme.materials.wall ?? theme.palette[2] ?? "#cccccc";
  const ceilColor = theme.palette[1] ?? wallColor;
  const exitSet = useMemo(() => new Set<number>(EXIT_WALL_INDICES), []);

  return (
    <group>
      <mesh rotation-x={-Math.PI / 2} receiveShadow>
        <circleGeometry args={[HEX_RADIUS, 6]} />
        <meshStandardMaterial color={floorColor} roughness={0.9} side={DoubleSide} />
      </mesh>
      <mesh rotation-x={Math.PI / 2} position={[0, WALL_HEIGHT, 0]}>
        <circleGeometry args={[HEX_RADIUS, 6]} />
        <meshStandardMaterial color={ceilColor} roughness={1} side={DoubleSide} />
      </mesh>

      {[0, 1, 2, 3, 4, 5].map((i) => {
        const t = wallTransform(i);
        return exitSet.has(i) ? (
          <ExitFrame key={i} t={t} color={wallColor} />
        ) : (
          <mesh
            key={i}
            position={[t.position[0], WALL_HEIGHT / 2, t.position[2]]}
            rotation-y={t.rotationY}
          >
            <planeGeometry args={[t.width, WALL_HEIGHT]} />
            <meshStandardMaterial color={wallColor} roughness={0.95} side={DoubleSide} />
          </mesh>
        );
      })}
    </group>
  );
}

/** A wall with a doorway: two side panels + a lintel, leaving a central gap. */
function ExitFrame({ t, color }: { t: WallTransform; color: string }) {
  const side = (t.width - DOOR_W) / 2;
  const mat = <meshStandardMaterial color={color} roughness={0.95} side={DoubleSide} />;
  return (
    <group position={[t.position[0], 0, t.position[2]]} rotation-y={t.rotationY}>
      <mesh position={[-(DOOR_W / 2 + side / 2), WALL_HEIGHT / 2, 0]}>
        <planeGeometry args={[side, WALL_HEIGHT]} />
        {mat}
      </mesh>
      <mesh position={[DOOR_W / 2 + side / 2, WALL_HEIGHT / 2, 0]}>
        <planeGeometry args={[side, WALL_HEIGHT]} />
        {mat}
      </mesh>
      <mesh position={[0, (DOOR_H + WALL_HEIGHT) / 2, 0]}>
        <planeGeometry args={[DOOR_W, WALL_HEIGHT - DOOR_H]} />
        {mat}
      </mesh>
    </group>
  );
}
