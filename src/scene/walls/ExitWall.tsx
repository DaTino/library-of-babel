import { DoubleSide } from "three";
import { Html } from "@react-three/drei";
import type { Exit } from "../../model/types";
import { wallTransform } from "../../geometry/hexagon";
import { roomDisplayName } from "../../model/labels";
import { interactable } from "../../interaction/types";

const DOOR_W = 1.8;
const DOOR_H = 3;
const HALL_LEN = 3.2;
const HALL_COLOR = "#0c0b10";

/**
 * A doorway opening + a short, dark hallway stub (§3.1 / §6.2). Walking near it
 * (or clicking) travels to the connected room. The atrium passes a `sign` +
 * `accent` for legible, color-cued wayfinding (§3.2).
 */
export function ExitWall({ exit, sign, accent }: { exit: Exit; sign?: string; accent?: string }) {
  if (exit.wallIndex === undefined) return null;
  const t = wallTransform(exit.wallIndex);
  const dest = roomDisplayName(exit.toRoomId);
  const veil = accent ?? "#cdb37a";

  return (
    <group position={[t.position[0], 0, t.position[2]]} rotation-y={t.rotationY}>
      {/* hallway stub heads outward (local -Z) */}
      <mesh rotation-x={-Math.PI / 2} position={[0, 0.001, -HALL_LEN / 2]}>
        <planeGeometry args={[DOOR_W, HALL_LEN]} />
        <meshStandardMaterial color={HALL_COLOR} roughness={1} side={DoubleSide} />
      </mesh>
      <mesh rotation-x={Math.PI / 2} position={[0, DOOR_H, -HALL_LEN / 2]}>
        <planeGeometry args={[DOOR_W, HALL_LEN]} />
        <meshStandardMaterial color={HALL_COLOR} side={DoubleSide} />
      </mesh>
      <mesh position={[-DOOR_W / 2, DOOR_H / 2, -HALL_LEN / 2]} rotation-y={Math.PI / 2}>
        <planeGeometry args={[HALL_LEN, DOOR_H]} />
        <meshStandardMaterial color={HALL_COLOR} roughness={1} side={DoubleSide} />
      </mesh>
      <mesh position={[DOOR_W / 2, DOOR_H / 2, -HALL_LEN / 2]} rotation-y={Math.PI / 2}>
        <planeGeometry args={[HALL_LEN, DOOR_H]} />
        <meshStandardMaterial color={HALL_COLOR} roughness={1} side={DoubleSide} />
      </mesh>
      <mesh position={[0, DOOR_H / 2, -HALL_LEN]}>
        <planeGeometry args={[DOOR_W, DOOR_H]} />
        <meshStandardMaterial color="#050507" side={DoubleSide} />
      </mesh>

      {/* faint veil in the opening = the interaction / travel target */}
      <mesh
        position={[0, DOOR_H / 2, 0.02]}
        userData={interactable({
          kind: "exit",
          id: `exit:${exit.toRoomId}`,
          label: `To ${dest}`,
          targetRoomId: exit.toRoomId,
        })}
      >
        <planeGeometry args={[DOOR_W, DOOR_H]} />
        <meshBasicMaterial color={veil} transparent opacity={0.1} side={DoubleSide} />
      </mesh>

      {sign && (
        <Html position={[0, DOOR_H + 0.5, 0.15]} center distanceFactor={9}>
          <div className="door-sign">{sign}</div>
        </Html>
      )}
    </group>
  );
}
