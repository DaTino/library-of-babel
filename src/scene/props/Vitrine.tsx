import type { ReactNode } from "react";

const BRASS = "#cfa95e";
const noRaycast = () => null;

/**
 * A glass display case on a plinth (§6.3 / §9.1) — the hallway specimen cases,
 * the cases on top of the bookshelves, and the room centrepieces. Putting a
 * photographed object behind glass, on a mounted card, makes its rectangular
 * photo read as deliberate rather than a floating cut-out.
 *
 * `lit` uses lit materials (rooms); unlit ones keep hallways identical in both
 * rooms' frames (§2.7). Children are placed at the centre of the glass.
 */
export function Vitrine({
  width,
  depth,
  plinthHeight,
  glassHeight,
  plinthColor,
  deckColor = "#e2d9c4",
  lit = false,
  children,
}: {
  width: number;
  depth: number;
  plinthHeight: number;
  glassHeight: number;
  plinthColor: string;
  deckColor?: string;
  lit?: boolean;
  children?: ReactNode;
}) {
  const top = plinthHeight + glassHeight;
  const hw = width / 2;
  const hd = depth / 2;
  const posts: [number, number][] = [
    [-hw, -hd],
    [hw, -hd],
    [-hw, hd],
    [hw, hd],
  ];
  const mat = (color: string) =>
    lit ? (
      <meshStandardMaterial color={color} roughness={0.75} />
    ) : (
      <meshBasicMaterial color={color} />
    );
  const brass = () =>
    lit ? (
      <meshStandardMaterial color={BRASS} metalness={0.6} roughness={0.35} />
    ) : (
      <meshBasicMaterial color={BRASS} />
    );

  return (
    <group>
      {plinthHeight > 0 && (
        <mesh position-y={plinthHeight / 2}>
          <boxGeometry args={[width, plinthHeight, depth]} />
          {mat(plinthColor)}
        </mesh>
      )}
      <mesh position-y={plinthHeight + 0.006}>
        <boxGeometry args={[width - 0.04, 0.012, depth - 0.04]} />
        {mat(deckColor)}
      </mesh>
      <group position-y={plinthHeight + glassHeight / 2}>{children}</group>
      {/* glass */}
      <mesh position-y={plinthHeight + glassHeight / 2} raycast={noRaycast}>
        <boxGeometry args={[width, glassHeight, depth]} />
        <meshBasicMaterial color="#bfdbe4" transparent opacity={0.1} depthWrite={false} />
      </mesh>
      {/* brass frame: four posts, and rails around the top */}
      {posts.map(([x, z], i) => (
        <mesh key={i} position={[x, plinthHeight + glassHeight / 2, z]} raycast={noRaycast}>
          <boxGeometry args={[0.025, glassHeight, 0.025]} />
          {brass()}
        </mesh>
      ))}
      {[-hd, hd].map((z, i) => (
        <mesh key={`x${i}`} position={[0, top, z]} raycast={noRaycast}>
          <boxGeometry args={[width, 0.025, 0.025]} />
          {brass()}
        </mesh>
      ))}
      {[-hw, hw].map((x, i) => (
        <mesh key={`z${i}`} position={[x, top, 0]} raycast={noRaycast}>
          <boxGeometry args={[0.025, 0.025, depth]} />
          {brass()}
        </mesh>
      ))}
    </group>
  );
}
