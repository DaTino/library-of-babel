import { DoubleSide } from "three";
import type { Exit } from "../../model/types";
import { wallTransform } from "../../geometry/hexagon";
import { roomDisplayName } from "../../model/labels";
import { interactable } from "../../interaction/types";

const DOOR_W = 1.8;
const DOOR_H = 3;
const HALL_LEN = 3.2;
const HALL_COLOR = "#0c0b10";

/** A doorway opening + a short, dark hallway stub (§3.1 / §6.2). Walking
 *  through is wired up in Phase 3; for now the opening is a hoverable target. */
export function ExitWall({ exit }: { exit: Exit }) {
  if (exit.wallIndex === undefined) return null;
  const t = wallTransform(exit.wallIndex);
  const dest = roomDisplayName(exit.toRoomId);

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

      {/* faint veil in the opening = the interaction target */}
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
        <meshBasicMaterial color="#cdb37a" transparent opacity={0.08} side={DoubleSide} />
      </mesh>
    </group>
  );
}
