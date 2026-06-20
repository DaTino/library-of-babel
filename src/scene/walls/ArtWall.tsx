import { Suspense } from "react";
import { Billboard } from "@react-three/drei";
import type { ArtWall as ArtWallModel, BookRef, RoomTheme } from "../../model/types";
import { wallTransform } from "../../geometry/hexagon";
import { interactable } from "../../interaction/types";
import { ArtImage } from "../ArtImage";

const SPINE_COLORS = ["#7a2230", "#3a5f4a", "#2f4a6b", "#6b4f1f", "#4a2f5e", "#205a52"];

/**
 * Art wall content (§3.1, bottom → top): a bookshelf of clickable spines, a
 * billboarded artifact on top, and a framed painting on the upper wall.
 */
export function ArtWall({ wall, theme }: { wall: ArtWallModel; theme: RoomTheme }) {
  const t = wallTransform(wall.wallIndex);
  const accent = theme.palette[0] ?? "#caa86a";
  const shelfColor = theme.materials.floor ?? "#5a4632";
  const paintingData = interactable({
    kind: "painting",
    id: wall.painting.id,
    label: wall.painting.title,
    artwork: wall.painting,
  });

  return (
    <group position={[t.position[0], 0, t.position[2]]} rotation-y={t.rotationY}>
      {/* framed painting (upper wall) — real cached image when available (§8) */}
      <group position={[0, 3.2, 0.06]}>
        <mesh>
          <planeGeometry args={[2.2, 1.5]} />
          <meshStandardMaterial color="#15110c" roughness={0.6} />
        </mesh>
        <group position={[0, 0, 0.02]}>
          <Suspense
            fallback={
              <mesh userData={paintingData}>
                <planeGeometry args={[1.9, 1.2]} />
                <meshStandardMaterial color={accent} roughness={0.5} />
              </mesh>
            }
          >
            <ArtImage
              url={wall.painting.thumbUrl}
              width={1.9}
              height={1.2}
              userData={paintingData}
            />
          </Suspense>
        </group>
      </group>

      {/* bookshelf cabinet */}
      <mesh position={[0, 0.7, 0.2]}>
        <boxGeometry args={[2.4, 1.4, 0.4]} />
        <meshStandardMaterial color={shelfColor} roughness={0.85} />
      </mesh>

      <Books books={wall.shelf} y={1.05} z={0.34} />

      {/* artifact on top of the shelf (billboarded sprite, §6.3) */}
      <group position={[0, 1.4, 0.2]}>
        <mesh position={[0, 0.07, 0]}>
          <cylinderGeometry args={[0.32, 0.4, 0.16, 16]} />
          <meshStandardMaterial color="#2a2620" roughness={0.7} />
        </mesh>
        <Billboard position={[0, 0.62, 0]}>
          <mesh
            userData={interactable({
              kind: "artifact",
              id: wall.shelfItem.id,
              label: wall.shelfItem.title,
              artwork: wall.shelfItem,
            })}
          >
            <planeGeometry args={[0.72, 0.92]} />
            <meshBasicMaterial color={accent} toneMapped={false} />
          </mesh>
        </Billboard>
      </group>
    </group>
  );
}

function Books({ books, y, z }: { books: BookRef[]; y: number; z: number }) {
  const n = books.length;
  const spineW = 0.16;
  const gap = 0.034;
  const total = n * spineW + (n - 1) * gap;
  let cursor = -total / 2 + spineW / 2;

  return (
    <group position={[0, y, z]}>
      {books.map((b, i) => {
        const h = 0.32 + ((i * 7) % 5) * 0.025;
        const x = cursor;
        cursor += spineW + gap;
        return (
          <mesh
            key={b.id}
            position={[x, 0, 0]}
            userData={interactable({ kind: "book", id: b.id, label: b.title, book: b })}
          >
            <boxGeometry args={[spineW, h, 0.22]} />
            <meshStandardMaterial color={SPINE_COLORS[i % SPINE_COLORS.length]} roughness={0.7} />
          </mesh>
        );
      })}
    </group>
  );
}
