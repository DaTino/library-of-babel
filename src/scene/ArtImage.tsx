import { useTexture } from "@react-three/drei";
import { SRGBColorSpace } from "three";
import type { InteractableData } from "../interaction/types";

/**
 * A textured plane for a cached artwork image (§8). The image is served from our
 * own origin (build-time cache), so the texture is CORS-safe. The plane is
 * aspect-fit within the given box so art isn't stretched. Suspends while
 * loading — wrap in <Suspense> with a colored fallback.
 */
export function ArtImage({
  url,
  width,
  height,
  userData,
}: {
  url: string;
  width: number;
  height: number;
  userData: InteractableData;
}) {
  const texture = useTexture(url);
  texture.colorSpace = SRGBColorSpace;

  let w = width;
  let h = height;
  const img = texture.image as { width?: number; height?: number } | undefined;
  if (img?.width && img?.height) {
    const aspect = img.width / img.height;
    if (aspect > width / height) h = width / aspect;
    else w = height * aspect;
  }

  return (
    <mesh userData={userData}>
      <planeGeometry args={[w, h]} />
      <meshBasicMaterial map={texture} toneMapped={false} />
    </mesh>
  );
}
