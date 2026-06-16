import type { RoomTheme } from "../../model/types";
import { ART_WALL_INDICES, wallTransform } from "../../geometry/hexagon";

/** One bench per art wall, set between center and wall (§3.1). */
export function Benches({ theme }: { theme: RoomTheme }) {
  const color = theme.materials.floor ?? "#3a2f24";
  const radius = 1.7;

  return (
    <>
      {ART_WALL_INDICES.map((i) => {
        const t = wallTransform(i);
        const phi = ((i * 60 + 30) * Math.PI) / 180;
        return (
          <group
            key={i}
            position={[radius * Math.cos(phi), 0, radius * Math.sin(phi)]}
            rotation-y={t.rotationY}
          >
            <mesh position={[0, 0.25, 0]}>
              <boxGeometry args={[1.4, 0.12, 0.5]} />
              <meshStandardMaterial color={color} roughness={0.7} />
            </mesh>
            <mesh position={[-0.55, 0.12, 0]}>
              <boxGeometry args={[0.12, 0.24, 0.46]} />
              <meshStandardMaterial color={color} roughness={0.7} />
            </mesh>
            <mesh position={[0.55, 0.12, 0]}>
              <boxGeometry args={[0.12, 0.24, 0.46]} />
              <meshStandardMaterial color={color} roughness={0.7} />
            </mesh>
          </group>
        );
      })}
    </>
  );
}
