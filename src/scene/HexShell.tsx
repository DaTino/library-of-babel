import { useEffect, useMemo } from "react";
import {
  CircleGeometry,
  DoubleSide,
  Path,
  PlaneGeometry,
  Shape,
  ShapeGeometry,
  type BufferGeometry,
  type Texture,
} from "three";
import type { Room } from "../model/types";
import { HEX_RADIUS, WALL_HEIGHT, wallTransform, type WallTransform } from "../geometry/hexagon";
import { DOOR_HEIGHT, DOOR_WIDTH } from "../geometry/hallway";
import { TOWER_INNER_RADIUS } from "../geometry/stairs";
import { floorTexture, isFloorStyle, isWallStyle, wallTexture } from "./surfaces";
import { shade } from "./color";

const SKIRTING_H = 0.18;
const CROWN_H = 0.16;
const ARCHITRAVE = 0.13;

/** The reusable hexagon shell (§6.1): floor, ceiling, and 6 walls, dressed in the
 *  room's surface styles (§6.4) — a drawn floor and wall finish, real skirting
 *  boards, a cornice, and a moulded frame around every doorway. Walls that carry
 *  a doorway are drawn as a frame with a central opening; themed rooms get 3, the
 *  atrium 6 (§3.2). The atrium's floor and ceiling are pierced by the stair tower
 *  (§2.6), so the climb runs through them. */
export function HexShell({ room }: { room: Room }) {
  const theme = room.theme;
  const floorColor = theme.materials.floor ?? theme.palette[1] ?? "#888888";
  const wallColor = theme.materials.wall ?? theme.palette[2] ?? "#cccccc";
  const ceilColor = theme.palette[1] ?? wallColor;
  const trimColor = theme.materials.trim ?? shade(wallColor, 0.62);
  const floorMap = floorTexture(
    isFloorStyle(theme.materials.floorStyle) ? theme.materials.floorStyle : "flagstone",
  );
  const wallMap = wallTexture(
    isWallStyle(theme.materials.wallStyle) ? theme.materials.wallStyle : "plaster",
  );
  const pierced = room.kind === "atrium";

  const exitSet = useMemo(
    () =>
      new Set(
        room.exits
          .filter((e) => e.kind === "doorway" && e.wallIndex !== undefined)
          .map((e) => e.wallIndex as number),
      ),
    [room],
  );

  const slab = useMemo<BufferGeometry>(() => {
    let g: BufferGeometry;
    if (!pierced) {
      g = new CircleGeometry(HEX_RADIUS, 6);
    } else {
      // Hexagon (vertices at 0°, 60°, …) with a round hole for the tower.
      const shape = new Shape();
      for (let i = 0; i <= 6; i++) {
        const a = (i * Math.PI) / 3;
        const p: [number, number] = [HEX_RADIUS * Math.cos(a), HEX_RADIUS * Math.sin(a)];
        if (i === 0) shape.moveTo(...p);
        else shape.lineTo(...p);
      }
      const hole = new Path();
      hole.absarc(0, 0, TOWER_INNER_RADIUS + 0.05, 0, Math.PI * 2, true);
      shape.holes.push(hole);
      g = new ShapeGeometry(shape, 48);
    }
    return metresUV(g);
  }, [pierced]);
  useEffect(() => () => slab.dispose(), [slab]);

  return (
    <group>
      <mesh geometry={slab} rotation-x={-Math.PI / 2} receiveShadow>
        <meshStandardMaterial
          map={floorMap}
          color={floorColor}
          roughness={0.85}
          side={DoubleSide}
        />
      </mesh>
      <mesh geometry={slab} rotation-x={Math.PI / 2} position={[0, WALL_HEIGHT, 0]}>
        <meshStandardMaterial color={ceilColor} roughness={1} side={DoubleSide} />
      </mesh>

      {[0, 1, 2, 3, 4, 5].map((i) => {
        const t = wallTransform(i);
        const door = exitSet.has(i);
        return (
          <group key={i} position={[t.position[0], 0, t.position[2]]} rotation-y={t.rotationY}>
            <WallFace t={t} door={door} color={wallColor} map={wallMap} />
            <WallTrim t={t} door={door} color={trimColor} />
          </group>
        );
      })}
    </group>
  );
}

/** UVs in metres (x, y of the flat shape), so repeating floor textures keep scale. */
function metresUV(g: BufferGeometry): BufferGeometry {
  const pos = g.attributes.position;
  const uv = g.attributes.uv;
  for (let i = 0; i < pos.count; i++) uv.setXY(i, pos.getX(i), pos.getY(i));
  uv.needsUpdate = true;
  return g;
}

/** A rectangle of wall (wall-local metres) whose UVs pick out the same part of
 *  the whole-wall texture, so a doorway frame doesn't squash the pattern. */
function wallPiece(x0: number, x1: number, y0: number, y1: number, wallWidth: number) {
  const g = new PlaneGeometry(x1 - x0, y1 - y0);
  const uv = g.attributes.uv;
  for (let i = 0; i < uv.count; i++) {
    const x = x0 + uv.getX(i) * (x1 - x0);
    const y = y0 + uv.getY(i) * (y1 - y0);
    uv.setXY(i, (x + wallWidth / 2) / wallWidth, y / WALL_HEIGHT);
  }
  return { geo: g, x: (x0 + x1) / 2, y: (y0 + y1) / 2 };
}

function WallFace({
  t,
  door,
  color,
  map,
}: {
  t: WallTransform;
  door: boolean;
  color: string;
  map: Texture;
}) {
  const pieces = useMemo(() => {
    const W = t.width;
    if (!door) return [wallPiece(-W / 2, W / 2, 0, WALL_HEIGHT, W)];
    return [
      wallPiece(-W / 2, -DOOR_WIDTH / 2, 0, WALL_HEIGHT, W),
      wallPiece(DOOR_WIDTH / 2, W / 2, 0, WALL_HEIGHT, W),
      wallPiece(-DOOR_WIDTH / 2, DOOR_WIDTH / 2, DOOR_HEIGHT, WALL_HEIGHT, W),
    ];
  }, [t.width, door]);
  useEffect(() => () => pieces.forEach((p) => p.geo.dispose()), [pieces]);
  return (
    <>
      {pieces.map((p, i) => (
        <mesh key={i} geometry={p.geo} position={[p.x, p.y, 0]}>
          <meshStandardMaterial map={map} color={color} roughness={0.95} side={DoubleSide} />
        </mesh>
      ))}
    </>
  );
}

/** Skirting board, cornice, and (on doorway walls) a moulded door frame. */
function WallTrim({ t, door, color }: { t: WallTransform; door: boolean; color: string }) {
  const W = t.width;
  const runs: [number, number][] = door
    ? [
        [-W / 2, -DOOR_WIDTH / 2 - ARCHITRAVE],
        [DOOR_WIDTH / 2 + ARCHITRAVE, W / 2],
      ]
    : [[-W / 2, W / 2]];
  const mat = <meshStandardMaterial color={color} roughness={0.7} />;
  return (
    <>
      {runs.map(([a, b], i) => (
        <mesh key={i} position={[(a + b) / 2, SKIRTING_H / 2, 0.016]}>
          <boxGeometry args={[b - a, SKIRTING_H, 0.03]} />
          {mat}
        </mesh>
      ))}
      <mesh position={[0, WALL_HEIGHT - CROWN_H / 2, 0.035]}>
        <boxGeometry args={[W, CROWN_H, 0.07]} />
        {mat}
      </mesh>
      <mesh position={[0, WALL_HEIGHT - CROWN_H - 0.03, 0.02]}>
        <boxGeometry args={[W, 0.05, 0.04]} />
        {mat}
      </mesh>
      {door && (
        <>
          {[-1, 1].map((s) => (
            <mesh
              key={s}
              position={[
                s * (DOOR_WIDTH / 2 + ARCHITRAVE / 2),
                (DOOR_HEIGHT + ARCHITRAVE) / 2,
                0.025,
              ]}
            >
              <boxGeometry args={[ARCHITRAVE, DOOR_HEIGHT + ARCHITRAVE, 0.05]} />
              {mat}
            </mesh>
          ))}
          <mesh position={[0, DOOR_HEIGHT + ARCHITRAVE / 2, 0.025]}>
            <boxGeometry args={[DOOR_WIDTH + ARCHITRAVE * 2, ARCHITRAVE, 0.05]} />
            {mat}
          </mesh>
        </>
      )}
    </>
  );
}
