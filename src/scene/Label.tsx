import { useEffect, useMemo } from "react";
import type { Artwork } from "../model/types";
import { labelTexture } from "./canvasTextures";
import { labelFor } from "./labelContent";

const noRaycast = () => null;

/**
 * A museum label card for an artwork (§7 / §9.1), drawn once and shown on one
 * or more faces (a plinth gets one per side). Never blocks the pick-ray.
 */
export function ArtLabel({
  artwork,
  width,
  height,
  faces = [{ position: [0, 0, 0], rotationY: 0 }],
  lit = false,
}: {
  artwork: Artwork;
  width: number;
  height: number;
  faces?: { position: [number, number, number]; rotationY: number }[];
  lit?: boolean;
}) {
  const key = `${artwork.id}|${artwork.title}|${width}x${height}`;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const texture = useMemo(() => labelTexture(labelFor(artwork), width, height), [key]);
  useEffect(() => () => texture.dispose(), [texture]);
  return (
    <>
      {faces.map((f, i) => (
        <mesh key={i} position={f.position} rotation-y={f.rotationY} raycast={noRaycast}>
          <planeGeometry args={[width, height]} />
          {lit ? (
            // Spot-lit, in effect: unlit so the type stays crisp, but dimmed a
            // little so the card doesn't glare in a dim gallery.
            <meshBasicMaterial map={texture} color="#d6cfbf" toneMapped={false} />
          ) : (
            <meshBasicMaterial map={texture} toneMapped={false} />
          )}
        </mesh>
      ))}
    </>
  );
}
