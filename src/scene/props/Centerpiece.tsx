import { Suspense } from "react";
import { Billboard } from "@react-three/drei";
import { DoubleSide } from "three";
import type { Artwork } from "../../model/types";
import { interactable } from "../../interaction/types";
import { ArtImage } from "../ArtImage";
import { ArtLabel } from "../Label";
import { Vitrine } from "./Vitrine";

const W = 1.3;
const PLINTH = 0.7;
const GLASS = 1.9;

/**
 * The room's centrepiece (§3.1 / §6.3): the object's photograph on a mounted
 * card, turned toward the visitor, inside a large glass case on a stone plinth —
 * with its label on every side of the plinth.
 */
export function Centerpiece({ artwork }: { artwork: Artwork }) {
  const data = interactable({
    kind: "centerpiece",
    id: artwork.id,
    label: artwork.title,
    artwork,
  });
  const face = W / 2 + 0.002;
  return (
    <group>
      {/* soft contact shadow */}
      <mesh rotation-x={-Math.PI / 2} position={[0, 0.02, 0]}>
        <circleGeometry args={[1.25, 32]} />
        <meshBasicMaterial color="#000000" transparent opacity={0.22} side={DoubleSide} />
      </mesh>
      <Vitrine
        width={W}
        depth={W}
        plinthHeight={PLINTH}
        glassHeight={GLASS}
        plinthColor="#2a2621"
        lit
      >
        <Billboard lockX lockZ>
          <mesh position-z={-0.01}>
            <planeGeometry args={[1.12, 1.72]} />
            <meshStandardMaterial color="#e6dfcc" roughness={0.95} />
          </mesh>
          <Suspense
            fallback={
              <mesh userData={data}>
                <planeGeometry args={[1.0, 1.58]} />
                <meshStandardMaterial color="#d8c79a" />
              </mesh>
            }
          >
            <ArtImage url={artwork.thumbUrl} width={1.0} height={1.58} userData={data} />
          </Suspense>
        </Billboard>
      </Vitrine>
      <ArtLabel
        artwork={artwork}
        width={0.6}
        height={0.36}
        lit
        faces={[0, 1, 2, 3].map((k) => {
          const a = (k * Math.PI) / 2;
          return {
            position: [Math.sin(a) * face, PLINTH * 0.55, Math.cos(a) * face] as [
              number,
              number,
              number,
            ],
            rotationY: a,
          };
        })}
      />
    </group>
  );
}
