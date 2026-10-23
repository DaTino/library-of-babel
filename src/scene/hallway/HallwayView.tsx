import { Suspense, useMemo } from "react";
import { AdditiveBlending, DoubleSide, PlaneGeometry, Shape, ShapeGeometry } from "three";
import { Billboard } from "@react-three/drei";
import type { Exhibit, Hallway } from "../../model/types";
import {
  EXHIBIT_SLOTS,
  HALL_HEIGHT,
  HALL_JOG,
  HALL_LEG,
  HALL_OUTLINE,
  HALL_WALLS,
  LAMP_POINTS,
  SIGN_SLOTS,
  type Frame,
  type Slot,
} from "../../geometry/hallway";
import { interactable } from "../../interaction/types";
import { ArtImage } from "../ArtImage";
import { ArtLabel } from "../Label";
import { TextPlane } from "../TextPlane";
import { Vitrine } from "../props/Vitrine";
import { sharedTextures } from "../canvasTextures";

/**
 * One hallway (§2.7), drawn in the frame of the room the visitor is in: placed at
 * that room's doorway, heading outward. Every surface is unlit (basic materials
 * with painted-on light), so the hallway looks identical in either room's frame —
 * the room lights never touch it — and the frame swap at the midpoint is
 * invisible. Walls and lamps are symmetric; exhibits and plaques are authored
 * from ends[0] and point-reflected when seen from ends[1].
 */

const WALL_COLOR = "#5b4f40";
const FLOOR_COLOR = "#211b16";
const CEILING_COLOR = "#17130f";
const RUNNER_COLOR = "#4a1e1e";
const FRAME_COLOR = "#1a120b";
const BRASS = "#d8b46a";
const PLATE_Y = 1.95;

const noRaycast = () => null;

// Shared geometry for every hallway instance (built once).
let shell: {
  floor: ShapeGeometry;
  walls: { geo: PlaneGeometry; x: number; z: number; rot: number }[];
} | null = null;
function hallShell() {
  if (shell) return shell;
  const shape = new Shape();
  // Shape lives in XY; rotating −90° about X maps (x, y) → (x, 0, −y).
  HALL_OUTLINE.forEach((p, i) => (i === 0 ? shape.moveTo(p.x, -p.z) : shape.lineTo(p.x, -p.z)));
  shape.closePath();
  const walls = HALL_WALLS.map(([a, b]) => {
    const dx = b.x - a.x;
    const dz = b.z - a.z;
    return {
      geo: new PlaneGeometry(Math.hypot(dx, dz), HALL_HEIGHT),
      x: (a.x + b.x) / 2,
      z: (a.z + b.z) / 2,
      rot: Math.atan2(-dz, dx),
    };
  });
  shell = { floor: new ShapeGeometry(shape), walls };
  return shell;
}

// Carpet runner down the centerline (three strips).
const RUNNER_W = 1.5;
const RUNNERS = [
  { x: 0, z: -HALL_LEG / 2 - 0.4, w: RUNNER_W, l: HALL_LEG - 0.8 + RUNNER_W / 2 },
  { x: HALL_JOG / 2, z: -HALL_LEG, w: HALL_JOG + RUNNER_W, l: RUNNER_W },
  { x: HALL_JOG, z: -1.5 * HALL_LEG + 0.4, w: RUNNER_W, l: HALL_LEG - 0.8 + RUNNER_W / 2 },
];

export function HallwayView({
  hallway,
  frame,
  end,
}: {
  hallway: Hallway;
  frame: Frame;
  end: 0 | 1;
}) {
  const { floor, walls } = hallShell();
  const tex = sharedTextures();

  return (
    <group position={[frame.x, 0, frame.z]} rotation-y={frame.rot}>
      {/* shell */}
      <mesh geometry={floor} rotation-x={-Math.PI / 2}>
        <meshBasicMaterial color={FLOOR_COLOR} side={DoubleSide} />
      </mesh>
      <mesh geometry={floor} rotation-x={-Math.PI / 2} position-y={HALL_HEIGHT}>
        <meshBasicMaterial color={CEILING_COLOR} side={DoubleSide} />
      </mesh>
      {walls.map((w, i) => (
        <mesh key={i} geometry={w.geo} position={[w.x, HALL_HEIGHT / 2, w.z]} rotation-y={w.rot}>
          <meshBasicMaterial color={WALL_COLOR} map={tex.wall} side={DoubleSide} />
        </mesh>
      ))}
      {RUNNERS.map((r, i) => (
        <mesh key={i} rotation-x={-Math.PI / 2} position={[r.x, 0.004, r.z]} raycast={noRaycast}>
          <planeGeometry args={[r.w, r.l]} />
          <meshBasicMaterial color={RUNNER_COLOR} />
        </mesh>
      ))}

      {/* ceiling lamps + the pools of light beneath them */}
      {LAMP_POINTS.map((p, i) => (
        <group key={i} position={[p.x, 0, p.z]}>
          <mesh position-y={HALL_HEIGHT - 0.03} rotation-x={Math.PI / 2} raycast={noRaycast}>
            <circleGeometry args={[0.2, 20]} />
            <meshBasicMaterial color="#fff1cf" toneMapped={false} side={DoubleSide} />
          </mesh>
          <mesh position-y={0.008} rotation-x={-Math.PI / 2} raycast={noRaycast}>
            <planeGeometry args={[3.2, 3.2]} />
            <meshBasicMaterial
              map={tex.glow}
              color="#ffdca0"
              transparent
              opacity={0.22}
              blending={AdditiveBlending}
              depthWrite={false}
            />
          </mesh>
        </group>
      ))}

      {/* exhibits + plaques, authored from ends[0] */}
      <group
        position={end === 1 ? [HALL_JOG, 0, -2 * HALL_LEG] : [0, 0, 0]}
        rotation-y={end === 1 ? Math.PI : 0}
      >
        {hallway.exhibits.map((exhibit, i) => {
          const slot = EXHIBIT_SLOTS[i];
          if (!slot) return null;
          return slot.display === "case" ? (
            <DisplayCase key={i} slot={slot} exhibit={exhibit} />
          ) : (
            <WallPlate key={i} slot={slot} exhibit={exhibit} />
          );
        })}
        {SIGN_SLOTS.map((s, i) => (
          <group key={i} position={[s.x, 2.2, s.z]} rotation-y={s.rot}>
            <TextPlane
              width={1.5}
              height={0.62}
              style={{ background: "#120e0a", border: "rgba(216,180,106,0.55)" }}
              lines={[
                { text: "NATURAL HISTORY", size: 0.1, color: "#b9a37a", tracking: 6 },
                { text: hallway.title, size: 0.2, bold: true },
                { text: hallway.subtitle, size: 0.13, italic: true, color: "#cbbfa6" },
              ]}
            />
          </group>
        ))}
      </group>
    </group>
  );
}

function exhibitData(exhibit: Exhibit) {
  return interactable({
    kind: "specimen",
    id: exhibit.id,
    label: exhibit.title,
    artwork: exhibit,
  });
}

/** A framed plate on the wall, with a picture light and a pool of light (§9.1). */
function WallPlate({ slot, exhibit }: { slot: Slot; exhibit: Exhibit }) {
  const data = useMemo(() => exhibitData(exhibit), [exhibit]);
  const tex = sharedTextures();
  return (
    <group position={[slot.x, 0, slot.z]} rotation-y={slot.rot}>
      {/* light pool on the wall, behind the frame */}
      <mesh position={[0, PLATE_Y + 0.15, -0.04]} raycast={noRaycast}>
        <planeGeometry args={[2.4, 2.7]} />
        <meshBasicMaterial
          map={tex.glow}
          color="#ffd89a"
          transparent
          opacity={0.34}
          blending={AdditiveBlending}
          depthWrite={false}
        />
      </mesh>
      <mesh position-y={PLATE_Y}>
        <planeGeometry args={[1.3, 1.66]} />
        <meshBasicMaterial color={FRAME_COLOR} />
      </mesh>
      <mesh position-y={PLATE_Y} position-z={0.006}>
        <planeGeometry args={[1.18, 1.54]} />
        <meshBasicMaterial color="#e9e1cf" />
      </mesh>
      <group position={[0, PLATE_Y, 0.014]}>
        <Suspense
          fallback={
            <mesh userData={data}>
              <planeGeometry args={[1.06, 1.42]} />
              <meshBasicMaterial color="#cbbf9f" />
            </mesh>
          }
        >
          <ArtImage url={exhibit.thumbUrl} width={1.06} height={1.42} userData={data} />
        </Suspense>
      </group>
      {/* picture light */}
      <mesh position={[0, PLATE_Y + 0.98, 0.1]} raycast={noRaycast}>
        <boxGeometry args={[0.55, 0.05, 0.08]} />
        <meshBasicMaterial color={BRASS} toneMapped={false} />
      </mesh>
      {/* museum label, beside the frame */}
      <ArtLabel
        artwork={exhibit}
        width={0.5}
        height={0.31}
        faces={[{ position: [0.97, PLATE_Y - 0.55, 0.006], rotationY: 0 }]}
      />
    </group>
  );
}

const CASE_W = 0.8;
const PLINTH_H = 0.95;
const GLASS_H = 0.62;

/** A specimen in a glass display case on a plinth, down the middle (§9.1),
 *  labelled on both ends of the plinth (the two ways you walk past it). */
function DisplayCase({ slot, exhibit }: { slot: Slot; exhibit: Exhibit }) {
  const data = useMemo(() => exhibitData(exhibit), [exhibit]);
  const tex = sharedTextures();
  const face = CASE_W / 2 + 0.003;
  return (
    <group position={[slot.x, 0, slot.z]}>
      <mesh position-y={0.009} rotation-x={-Math.PI / 2} raycast={noRaycast}>
        <planeGeometry args={[2.6, 2.6]} />
        <meshBasicMaterial
          map={tex.glow}
          color="#ffd89a"
          transparent
          opacity={0.28}
          blending={AdditiveBlending}
          depthWrite={false}
        />
      </mesh>
      <Vitrine
        width={CASE_W}
        depth={CASE_W}
        plinthHeight={PLINTH_H}
        glassHeight={GLASS_H}
        plinthColor="#2c2219"
      >
        {/* the specimen, always turned toward the visitor (§6.3) */}
        <Billboard lockX lockZ>
          <Suspense
            fallback={
              <mesh userData={data}>
                <planeGeometry args={[0.62, 0.48]} />
                <meshBasicMaterial color="#cbbf9f" />
              </mesh>
            }
          >
            <ArtImage url={exhibit.thumbUrl} width={0.66} height={0.5} userData={data} />
          </Suspense>
        </Billboard>
      </Vitrine>
      <ArtLabel
        artwork={exhibit}
        width={0.6}
        height={0.37}
        faces={[
          { position: [0, PLINTH_H * 0.62, face], rotationY: 0 },
          { position: [0, PLINTH_H * 0.62, -face], rotationY: Math.PI },
        ]}
      />
    </group>
  );
}
