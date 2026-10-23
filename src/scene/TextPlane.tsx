import { useEffect, useMemo } from "react";
import { signTexture, type SignStyle, type TextLine } from "./canvasTextures";

/**
 * A flat sign rendered from a canvas texture (§3.2 / §2.7). Unlike a DOM overlay
 * it's real geometry, so walls hide it — important now that hallways put other
 * rooms' signage just the other side of a wall.
 */
export function TextPlane({
  lines,
  width,
  height,
  style,
}: {
  lines: TextLine[];
  width: number;
  height: number;
  style: SignStyle;
}) {
  const key = JSON.stringify([lines, width, height, style]);
  const texture = useMemo(
    () => signTexture(lines, width, height, style),
    // `key` captures every input; the arrays/objects themselves are re-created
    // on each render by callers.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [key],
  );
  useEffect(() => () => texture.dispose(), [texture]);

  return (
    <mesh>
      <planeGeometry args={[width, height]} />
      <meshBasicMaterial map={texture} transparent toneMapped={false} />
    </mesh>
  );
}
