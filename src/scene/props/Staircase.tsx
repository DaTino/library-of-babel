import { DoubleSide } from "three";
import type { Exit } from "../../model/types";
import { interactable } from "../../interaction/types";

const STEPS = 16;

/**
 * The spiral staircase at the atrium's center (§2.6 / §3.2). Stylized — a
 * helix of steps you walk onto to ride a gentle fade to the next floor (Q13:
 * transition scene, not literal climbing). The (one) connected atrium for a
 * finite 2-floor tower is up on the ground floor, down on top.
 */
export function Staircase({ exits }: { exits: Exit[] }) {
  const up = exits.find((e) => e.kind === "staircase-up");
  const down = exits.find((e) => e.kind === "staircase-down");
  const target = up ?? down;

  return (
    <group>
      {/* newel post */}
      <mesh position={[0, 1.7, 0]}>
        <cylinderGeometry args={[0.16, 0.16, 3.4, 12]} />
        <meshStandardMaterial color="#241f19" roughness={0.85} />
      </mesh>
      {/* base ring */}
      <mesh position={[0, 0.04, 0]} rotation-x={-Math.PI / 2}>
        <ringGeometry args={[0.7, 1.15, 28]} />
        <meshStandardMaterial color="#2a2620" side={DoubleSide} />
      </mesh>
      {/* steps */}
      {Array.from({ length: STEPS }).map((_, i) => {
        const a = (i / STEPS) * Math.PI * 3; // ~1.5 turns
        const y = 0.16 + (i / STEPS) * 3.0;
        const r = 0.78;
        return (
          <mesh key={i} position={[r * Math.cos(a), y, r * Math.sin(a)]} rotation-y={-a}>
            <boxGeometry args={[0.84, 0.08, 0.34]} />
            <meshStandardMaterial color="#3a342b" roughness={0.85} />
          </mesh>
        );
      })}

      {/* invisible travel target around the stairs */}
      {target && (
        <mesh
          position={[0, 1.1, 0]}
          userData={interactable({
            kind: "exit",
            id: `stair:${target.toRoomId}`,
            label: up ? "Ascend ↑" : "Descend ↓",
            targetRoomId: target.toRoomId,
          })}
        >
          <cylinderGeometry args={[1.05, 1.05, 2.4, 16]} />
          <meshBasicMaterial transparent opacity={0} depthWrite={false} />
        </mesh>
      )}
    </group>
  );
}
