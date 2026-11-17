import { Component, Suspense, useEffect, type ReactNode } from "react";
import { Billboard, useTexture } from "@react-three/drei";
import { SRGBColorSpace } from "three";
import type { Artwork } from "../model/types";
import type { InteractableData } from "../interaction/types";
import { trackTexture } from "./textureBudget";

interface ArtImageProps {
  url: string;
  width: number;
  height: number;
  userData: InteractableData;
}

/** If an image can't load (a missing or broken file), show a plain card in its
 *  place instead of letting the error take down the scene. */
class ImageFailsafe extends Component<
  { fallback: ReactNode; children: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch(error: unknown) {
    console.warn("[art] image failed to load:", error);
  }
  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}

/**
 * A textured plane for a cached artwork image (§8). The image is served from our
 * own origin (build-time cache or the owner's curation, §8.6), so the texture is
 * CORS-safe. The plane is aspect-fit within the given box so art isn't
 * stretched. Suspends while loading — wrap in <Suspense> with a colored
 * fallback. A file that fails to load shows as a plain card.
 */
export function ArtImage(props: ArtImageProps) {
  return (
    <ImageFailsafe
      key={props.url}
      fallback={
        <mesh userData={props.userData}>
          <planeGeometry args={[props.width, props.height]} />
          <meshBasicMaterial color="#3a352d" />
        </mesh>
      }
    >
      <LoadedImage {...props} />
    </ImageFailsafe>
  );
}

function LoadedImage({ url, width, height, userData }: ArtImageProps) {
  const texture = useTexture(url);
  texture.colorSpace = SRGBColorSpace;

  // Register for the texture-budget pass (disposed on floor exit, §12).
  useEffect(() => {
    trackTexture(url, texture);
  }, [url, texture]);

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

/**
 * A billboarded artwork sprite (§6.3) — used for shelf artifacts and the central
 * centerpiece. Shows the real cached image when present, falling back to a solid
 * sprite while it loads (or when content is uncached). The `userData` makes the
 * sprite interactable whether the image has loaded yet or not.
 */
export function BillboardArtwork({
  artwork,
  width,
  height,
  position,
  fallbackColor,
  userData,
}: {
  artwork: Artwork;
  width: number;
  height: number;
  position?: [number, number, number];
  fallbackColor: string;
  userData: InteractableData;
}) {
  return (
    <Billboard position={position}>
      <Suspense
        fallback={
          <mesh userData={userData}>
            <planeGeometry args={[width, height]} />
            <meshBasicMaterial color={fallbackColor} toneMapped={false} />
          </mesh>
        }
      >
        <ArtImage url={artwork.thumbUrl} width={width} height={height} userData={userData} />
      </Suspense>
    </Billboard>
  );
}
