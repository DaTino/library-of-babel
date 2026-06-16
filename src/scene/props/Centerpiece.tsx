import { Billboard } from "@react-three/drei";
import { DoubleSide } from "three";
import type { Artwork } from "../../model/types";
import { interactable } from "../../interaction/types";

/** Large central sculpture as a billboarded sprite on a plinth (§3.1 / §6.3). */
export function Centerpiece({ artwork }: { artwork: Artwork }) {
  return (
    <group>
      {/* fake contact shadow */}
      <mesh rotation-x={-Math.PI / 2} position={[0, 0.02, 0]}>
        <circleGeometry args={[0.95, 24]} />
        <meshBasicMaterial color="#000000" transparent opacity={0.25} side={DoubleSide} />
      </mesh>
      <mesh position={[0, 0.35, 0]}>
        <cylinderGeometry args={[0.55, 0.65, 0.7, 24]} />
        <meshStandardMaterial color="#1d1a16" roughness={0.8} />
      </mesh>
      <Billboard position={[0, 1.7, 0]}>
        <mesh userData={interactable({ kind: "centerpiece", id: artwork.id, label: artwork.title })}>
          <planeGeometry args={[1.5, 2.1]} />
          <meshBasicMaterial color="#d8c79a" toneMapped={false} />
        </mesh>
      </Billboard>
    </group>
  );
}
