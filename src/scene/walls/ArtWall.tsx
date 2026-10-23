import { Suspense, useEffect, useMemo } from "react";
import type { ArtWall as ArtWallModel, BookRef, RoomTheme } from "../../model/types";
import { wallTransform } from "../../geometry/hexagon";
import { interactable } from "../../interaction/types";
import { ArtImage } from "../ArtImage";
import { ArtLabel } from "../Label";
import { Vitrine } from "../props/Vitrine";
import { spinesTexture, type SpineDraw } from "../canvasTextures";
import { shade } from "../color";

const SPINE_COLORS = ["#7a2230", "#3a5f4a", "#2f4a6b", "#6b4f1f", "#4a2f5e", "#205a52"];
const noRaycast = () => null;

// Bookcase (wall-local metres; +z points into the room).
const CASE_W = 2.4;
const CASE_H = 1.4;
const CASE_D = 0.42;
const SHELF_Y = 0.8; // top of the shelf board the books stand on
const BOOK_D = 0.22;
const BOOK_Z = 0.25; // centre depth of the books
const SPINE_W = 0.16;
const SPINE_GAP = 0.034;

/**
 * Art wall content (§3.1, bottom → top): a bookcase — books with titled spines
 * on an open shelf over a closed cupboard — a glass case on top holding the
 * room's artifact, and a framed painting on the upper wall, each with a museum
 * label (§7).
 */
export function ArtWall({ wall, theme }: { wall: ArtWallModel; theme: RoomTheme }) {
  const t = wallTransform(wall.wallIndex);
  const accent = theme.palette[0] ?? "#caa86a";
  const wood = theme.materials.trim ?? shade(theme.materials.floor ?? "#5a4632", 0.95);
  const paintingData = interactable({
    kind: "painting",
    id: wall.painting.id,
    label: wall.painting.title,
    artwork: wall.painting,
  });
  const artifactData = interactable({
    kind: "artifact",
    id: wall.shelfItem.id,
    label: wall.shelfItem.title,
    artwork: wall.shelfItem,
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
      <ArtLabel
        artwork={wall.painting}
        width={0.62}
        height={0.38}
        lit
        faces={[{ position: [1.52, 2.66, 0.012], rotationY: 0 }]}
      />

      <Bookcase books={wall.shelf} wood={wood} />

      {/* the artifact, on a mounted card in a glass case on top of the bookcase */}
      <group position={[0, CASE_H + 0.02, 0.2]}>
        <Vitrine
          width={0.82}
          depth={0.34}
          plinthHeight={0.07}
          glassHeight={0.86}
          plinthColor={shade(wood, 0.8)}
          lit
        >
          <mesh position-z={-0.14}>
            <planeGeometry args={[0.74, 0.8]} />
            <meshStandardMaterial color="#e6dfcc" roughness={0.95} />
          </mesh>
          <group position-z={-0.13}>
            <Suspense
              fallback={
                <mesh userData={artifactData}>
                  <planeGeometry args={[0.66, 0.72]} />
                  <meshStandardMaterial color={accent} />
                </mesh>
              }
            >
              <ArtImage
                url={wall.shelfItem.thumbUrl}
                width={0.66}
                height={0.72}
                userData={artifactData}
              />
            </Suspense>
          </group>
        </Vitrine>
        {/* its label hangs on the wall beside the case */}
        <ArtLabel
          artwork={wall.shelfItem}
          width={0.5}
          height={0.31}
          lit
          faces={[{ position: [-0.8, 0.32, -0.188], rotationY: 0 }]}
        />
      </group>
    </group>
  );
}

/** An open shelf of books (titled spines) over a cupboard. */
function Bookcase({ books, wood }: { books: BookRef[]; wood: string }) {
  const mat = <meshStandardMaterial color={wood} roughness={0.8} />;
  const dark = <meshStandardMaterial color={shade(wood, 0.7)} roughness={0.85} />;
  return (
    <group>
      {/* carcass */}
      <mesh position={[0, CASE_H / 2, 0.01]}>
        <boxGeometry args={[CASE_W, CASE_H, 0.02]} />
        {dark}
      </mesh>
      {[-1, 1].map((s) => (
        <mesh key={s} position={[s * (CASE_W / 2 - 0.02), CASE_H / 2, CASE_D / 2]}>
          <boxGeometry args={[0.04, CASE_H, CASE_D]} />
          {mat}
        </mesh>
      ))}
      <mesh position={[0, CASE_H + 0.01, CASE_D / 2 + 0.01]}>
        <boxGeometry args={[CASE_W + 0.06, 0.04, CASE_D + 0.04]} />
        {mat}
      </mesh>
      <mesh position={[0, SHELF_Y - 0.015, CASE_D / 2]}>
        <boxGeometry args={[CASE_W - 0.08, 0.03, CASE_D - 0.02]} />
        {mat}
      </mesh>
      <mesh position={[0, 0.05, CASE_D / 2]}>
        <boxGeometry args={[CASE_W, 0.1, CASE_D]} />
        {dark}
      </mesh>
      {/* cupboard doors */}
      <mesh position={[0, (0.1 + SHELF_Y - 0.03) / 2, CASE_D - 0.01]}>
        <boxGeometry args={[CASE_W - 0.08, SHELF_Y - 0.13, 0.02]} />
        {mat}
      </mesh>
      {[-1, 1].map((s) => (
        <group key={s}>
          <mesh position={[s * 0.58, (0.1 + SHELF_Y - 0.03) / 2, CASE_D + 0.002]}>
            <boxGeometry args={[1.0, SHELF_Y - 0.27, 0.012]} />
            {dark}
          </mesh>
          <mesh position={[s * 0.1, (0.1 + SHELF_Y) / 2, CASE_D + 0.015]}>
            <sphereGeometry args={[0.018, 10, 8]} />
            <meshStandardMaterial color="#cfa95e" metalness={0.6} roughness={0.35} />
          </mesh>
        </group>
      ))}
      <Books books={books} />
    </group>
  );
}

function Books({ books }: { books: BookRef[] }) {
  const layout = useMemo(() => {
    const n = books.length;
    const total = n * SPINE_W + Math.max(0, n - 1) * SPINE_GAP;
    return {
      total,
      spines: books.map((b, i) => ({
        book: b,
        x: i * (SPINE_W + SPINE_GAP), // from the row's left end
        height: 0.32 + ((i * 7) % 5) * 0.025,
        color: SPINE_COLORS[i % SPINE_COLORS.length],
      })),
    };
  }, [books]);
  const rowHeight = 0.42;
  const key = books.map((b) => b.id).join("|");
  const texture = useMemo(
    () =>
      spinesTexture(
        layout.spines.map<SpineDraw>((s) => ({
          x: s.x,
          width: SPINE_W,
          height: s.height,
          color: s.color,
          title: s.book.title,
        })),
        Math.max(layout.total, 0.01),
        rowHeight,
      ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [key],
  );
  useEffect(() => () => texture.dispose(), [texture]);

  const left = -layout.total / 2;
  return (
    <group position={[0, SHELF_Y, 0]}>
      {layout.spines.map((s) => (
        <mesh
          key={s.book.id}
          position={[left + s.x + SPINE_W / 2, s.height / 2, BOOK_Z]}
          userData={interactable({
            kind: "book",
            id: s.book.id,
            label: s.book.title,
            book: s.book,
          })}
        >
          <boxGeometry args={[SPINE_W, s.height, BOOK_D]} />
          <meshStandardMaterial color={s.color} roughness={0.7} />
        </mesh>
      ))}
      {/* the titled spines, just in front of the books (doesn't block picking) */}
      {books.length > 0 && (
        <mesh position={[0, rowHeight / 2, BOOK_Z + BOOK_D / 2 + 0.002]} raycast={noRaycast}>
          <planeGeometry args={[layout.total, rowHeight]} />
          <meshStandardMaterial map={texture} transparent roughness={0.75} />
        </mesh>
      )}
    </group>
  );
}
