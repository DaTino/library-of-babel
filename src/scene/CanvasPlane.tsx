import { useEffect, useMemo } from "react";
import type { CanvasTexture } from "three";

const noRaycast = () => null;

/**
 * A plane showing a canvas-drawn texture (labels, wall text, spines). The texture
 * is rebuilt only when `cacheKey` changes and disposed on unmount. By default the
 * plane ignores the pick-ray, so it never blocks the exhibit it describes.
 */
export function CanvasPlane({
  width,
  height,
  cacheKey,
  make,
  transparent = false,
  lit = false,
  pickable = false,
}: {
  width: number;
  height: number;
  /** Changes whenever the drawing's inputs change. */
  cacheKey: string;
  make: () => CanvasTexture;
  transparent?: boolean;
  /** Use a lit material (rooms) instead of an unlit one (hallways, signs). */
  lit?: boolean;
  pickable?: boolean;
}) {
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const texture = useMemo(make, [cacheKey]);
  useEffect(() => () => texture.dispose(), [texture]);

  return (
    <mesh {...(pickable ? {} : { raycast: noRaycast })}>
      <planeGeometry args={[width, height]} />
      {lit ? (
        <meshStandardMaterial map={texture} transparent={transparent} roughness={0.85} />
      ) : (
        <meshBasicMaterial map={texture} transparent={transparent} toneMapped={false} />
      )}
    </mesh>
  );
}
