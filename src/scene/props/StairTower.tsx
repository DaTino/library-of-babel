import { useEffect, useLayoutEffect, useMemo, useRef } from "react";
import {
  AdditiveBlending,
  BufferGeometry,
  DoubleSide,
  Float32BufferAttribute,
  Object3D,
  type InstancedMesh,
} from "three";
import { sharedTextures } from "../canvasTextures";

const noRaycast = () => null;
import type { Room } from "../../model/types";
import { WALL_HEIGHT } from "../../geometry/hexagon";
import {
  COLUMN_RADIUS,
  FLOOR_TO_FLOOR,
  STEP_ANGLE,
  TOWER_DOOR_HALF_ANGLE,
  TOWER_DOOR_HEIGHT,
  TOWER_INNER_RADIUS,
  TOWER_RADIUS,
  doorAngle,
  landingAngle,
  stairHeight,
  stairSteps,
} from "../../geometry/stairs";
import { interactable } from "../../interaction/types";
import { TextPlane } from "../TextPlane";

const STONE = "#6b6670";
const STEP_COLOR = "#6a6058";
const STEP_THICKNESS = 0.24;
const SEGMENTS = 64;

/**
 * The spiral stair tower (§2.6). One continuous tower for the whole museum,
 * drawn in the current atrium's frame (so it's offset down by this floor's
 * height). Because it's one object spanning every floor, a climb is a real walk
 * through real geometry, and re-basing at the top just shifts it — invisibly.
 */
export function StairTower({
  atrium,
  topLevel,
  floorTitles,
}: {
  atrium: Room;
  topLevel: number;
  floorTitles: Map<number, string>;
}) {
  const level = atrium.floorLevel;
  const top = topLevel * FLOOR_TO_FLOOR + WALL_HEIGHT; // tower top (above ground)

  const wall = useMemo(() => towerWallGeometry(topLevel, top), [topLevel, top]);
  const steps = useMemo(() => stairSteps(topLevel), [topLevel]);
  const stepsRef = useRef<InstancedMesh>(null);

  useLayoutEffect(() => {
    const mesh = stepsRef.current;
    if (!mesh) return;
    const o = new Object3D();
    const mid = (COLUMN_RADIUS + TOWER_INNER_RADIUS) / 2;
    steps.forEach((s, i) => {
      o.position.set(mid * Math.cos(s.phi), s.top - STEP_THICKNESS / 2, mid * Math.sin(s.phi));
      o.rotation.set(0, -s.phi, 0);
      o.updateMatrix();
      mesh.setMatrixAt(i, o.matrix);
    });
    mesh.instanceMatrix.needsUpdate = true;
    mesh.computeBoundingSphere();
  }, [steps]);

  useEffect(() => () => wall.dispose(), [wall]);

  // A sconce every 90° of the climb, at head height above the stair.
  const sconces = useMemo(() => {
    const list: { phi: number; y: number }[] = [];
    const end = landingAngle(topLevel);
    for (let phi = landingAngle(0) + Math.PI / 4; phi < end; phi += Math.PI / 2)
      list.push({ phi, y: stairHeight(phi) + 2.6 });
    return list;
  }, [topLevel]);
  const glow = sharedTextures().glow;

  const up = atrium.exits.find((e) => e.kind === "staircase-up");
  const down = atrium.exits.find((e) => e.kind === "staircase-down");
  const a = doorAngle(level);
  const phi0 = landingAngle(level);
  const tread = 2 * TOWER_INNER_RADIUS * Math.sin(STEP_ANGLE / 2) * 1.08;
  const label = (dirWord: string, toLevel: number) =>
    `${dirWord} to ${floorTitles.get(toLevel) ?? `floor ${toLevel + 1}`}`;

  return (
    <group position-y={-level * FLOOR_TO_FLOOR}>
      {/* wall, with a doorway at every floor. The atrium's key light sits inside
          the tower, so its outer face only gets the hemisphere fill — a little
          emissive keeps it reading as stone. */}
      <mesh geometry={wall}>
        <meshStandardMaterial color={STONE} emissive="#1f1d24" roughness={0.9} side={DoubleSide} />
      </mesh>
      {/* central column */}
      <mesh position-y={top / 2}>
        <cylinderGeometry args={[COLUMN_RADIUS, COLUMN_RADIUS, top, 24]} />
        <meshStandardMaterial color="#3b3740" roughness={0.85} />
      </mesh>
      {/* base + cap */}
      <mesh rotation-x={-Math.PI / 2} position-y={0.002}>
        <circleGeometry args={[TOWER_INNER_RADIUS + 0.05, 40]} />
        <meshStandardMaterial color="#2d2a30" side={DoubleSide} />
      </mesh>
      <mesh rotation-x={Math.PI / 2} position-y={top - 0.002}>
        <circleGeometry args={[TOWER_INNER_RADIUS + 0.05, 40]} />
        <meshStandardMaterial color="#232027" side={DoubleSide} />
      </mesh>
      {/* the helix of steps, ground landing to top landing */}
      <instancedMesh ref={stepsRef} args={[undefined, undefined, steps.length]}>
        <boxGeometry args={[TOWER_INNER_RADIUS - COLUMN_RADIUS + 0.08, STEP_THICKNESS, tread]} />
        <meshStandardMaterial color={STEP_COLOR} roughness={0.8} />
      </instancedMesh>
      {/* sconces on the inner wall, climbing with the stair */}
      {sconces.map((s, i) => (
        <group
          key={i}
          position={[
            (TOWER_INNER_RADIUS - 0.03) * Math.cos(s.phi),
            s.y,
            (TOWER_INNER_RADIUS - 0.03) * Math.sin(s.phi),
          ]}
          rotation-y={Math.atan2(-Math.cos(s.phi), -Math.sin(s.phi))}
        >
          <mesh raycast={noRaycast}>
            <planeGeometry args={[2.2, 2.2]} />
            <meshBasicMaterial
              map={glow}
              color="#ffcf8a"
              transparent
              opacity={0.45}
              blending={AdditiveBlending}
              depthWrite={false}
            />
          </mesh>
          <mesh position-z={0.05} raycast={noRaycast}>
            <boxGeometry args={[0.12, 0.26, 0.1]} />
            <meshBasicMaterial color="#ffe6b8" toneMapped={false} />
          </mesh>
        </group>
      ))}

      {/* this floor's doorway: sign + the clickable up / down flights */}
      <group position-y={level * FLOOR_TO_FLOOR}>
        <group
          position={[
            (TOWER_RADIUS + 0.03) * Math.cos(a),
            TOWER_DOOR_HEIGHT + 0.45,
            (TOWER_RADIUS + 0.03) * Math.sin(a),
          ]}
          rotation-y={Math.atan2(Math.cos(a), Math.sin(a))}
        >
          <TextPlane
            width={1.9}
            height={0.5}
            style={{ background: "#0b0a0d", border: "rgba(194,162,90,0.45)" }}
            lines={[
              {
                text: up && down ? "↑ Ascend  ·  Descend ↓" : up ? "↑ Ascend" : "Descend ↓",
                size: 0.4,
              },
            ]}
          />
        </group>
        {up && (
          <FlightTarget
            phi={phi0 + 3 * STEP_ANGLE}
            y={stairHeight(phi0 + 3 * STEP_ANGLE) - level * FLOOR_TO_FLOOR + 0.9}
            data={interactable({
              kind: "stairs",
              id: `stairs-up:${atrium.id}`,
              label: label("↑ Ascend", level + 1),
              targetRoomId: up.toRoomId,
              climbDir: 1,
            })}
          />
        )}
        {down && (
          <FlightTarget
            phi={phi0 - 3 * STEP_ANGLE}
            y={stairHeight(phi0 - 3 * STEP_ANGLE) - level * FLOOR_TO_FLOOR + 0.9}
            data={interactable({
              kind: "stairs",
              id: `stairs-down:${atrium.id}`,
              label: label("↓ Descend", level - 1),
              targetRoomId: down.toRoomId,
              climbDir: -1,
            })}
          />
        )}
      </group>
    </group>
  );
}

/** An invisible hit box over the first few steps of a flight. */
function FlightTarget({
  phi,
  y,
  data,
}: {
  phi: number;
  y: number;
  data: ReturnType<typeof interactable>;
}) {
  const mid = (COLUMN_RADIUS + TOWER_INNER_RADIUS) / 2;
  return (
    <mesh
      position={[mid * Math.cos(phi), y, mid * Math.sin(phi)]}
      rotation-y={-phi}
      userData={data}
    >
      <boxGeometry args={[TOWER_INNER_RADIUS - COLUMN_RADIUS, 2, 1.6]} />
      <meshBasicMaterial transparent opacity={0} depthWrite={false} />
    </mesh>
  );
}

/**
 * The tower's cylindrical wall from the ground to `top`, leaving a doorway
 * (±TOWER_DOOR_HALF_ANGLE, TOWER_DOOR_HEIGHT tall) at every floor's landing.
 */
function towerWallGeometry(topLevel: number, top: number): BufferGeometry {
  const pos: number[] = [];
  const quad = (a0: number, a1: number, y0: number, y1: number) => {
    if (y1 - y0 < 1e-3) return;
    const r = TOWER_RADIUS;
    const p = (a: number, y: number) => [r * Math.cos(a), y, r * Math.sin(a)];
    const [A, B, C, D] = [p(a0, y0), p(a1, y0), p(a1, y1), p(a0, y1)];
    pos.push(...A, ...C, ...B, ...A, ...D, ...C);
  };
  const doors = Array.from({ length: topLevel + 1 }, (_, k) => ({
    angle: doorAngle(k),
    y0: k * FLOOR_TO_FLOOR,
    y1: k * FLOOR_TO_FLOOR + TOWER_DOOR_HEIGHT,
  }));
  // Unsigned angular distance in [0, π].
  const angDist = (x: number, y: number) =>
    Math.abs(((((x - y) % (2 * Math.PI)) + 3 * Math.PI) % (2 * Math.PI)) - Math.PI);

  for (let i = 0; i < SEGMENTS; i++) {
    const a0 = (i / SEGMENTS) * Math.PI * 2;
    const a1 = ((i + 1) / SEGMENTS) * Math.PI * 2;
    const mid = (a0 + a1) / 2;
    // Floors whose doorway cuts through this segment, bottom to top.
    const cuts = doors.filter((d) => angDist(mid, d.angle) < TOWER_DOOR_HALF_ANGLE);
    let y = 0;
    for (const c of cuts) {
      quad(a0, a1, y, c.y0);
      y = c.y1;
    }
    quad(a0, a1, y, top);
  }

  const g = new BufferGeometry();
  g.setAttribute("position", new Float32BufferAttribute(pos, 3));
  g.computeVertexNormals();
  return g;
}
