import { Billboard } from "@react-three/drei";
import { AdditiveBlending } from "three";
import type { Room } from "../model/types";
import { WALL_HEIGHT } from "../geometry/hexagon";
import { HexShell } from "./HexShell";
import { RoomLighting } from "./RoomLighting";
import { ExitWall, type IntroText } from "./walls/ExitWall";
import { roomDisplayName } from "../model/labels";
import { DEFAULT_FLOOR_INTRO, FLOOR_INTROS } from "../data/introductions";
import { sharedTextures } from "./canvasTextures";

const LANTERN_R = 4.35;
const LANTERN_Y = WALL_HEIGHT - 0.95;
/** Three lanterns around the stair tower (which fills the atrium's centre). */
const LANTERNS: [number, number, number][] = [90, 210, 330].map((deg) => {
  const a = (deg * Math.PI) / 180;
  return [LANTERN_R * Math.cos(a), LANTERN_Y, LANTERN_R * Math.sin(a)];
});

const noRaycast = () => null;

/** The atrium hub (§3.2): hexagonal, all 6 walls are signed/color-cued doorways,
 *  lit by hanging lanterns. The stair tower at its center (§2.6) is drawn
 *  separately (StairTower), since one tower spans every floor. `role="destination"`
 *  is the atrium being climbed to, drawn alongside the current one during a climb. */
export function Atrium({
  room,
  rooms,
  floorTitle,
  role = "main",
}: {
  room: Room;
  rooms: Map<string, Room>;
  floorTitle: string;
  role?: "main" | "destination";
}) {
  const floorId = room.id.split(":")[0];
  const fi = FLOOR_INTROS[floorId] ?? DEFAULT_FLOOR_INTRO;
  const intro: IntroText = {
    heading: "The Atrium",
    title: floorTitle,
    dates: fi.dates,
    text: fi.text,
  };
  return (
    <group>
      <RoomLighting theme={room.theme} role={role} keys={LANTERNS} />
      <HexShell room={room} />
      {LANTERNS.map((p, i) => (
        <Lantern key={i} position={p} />
      ))}

      {room.exits
        .filter((exit) => exit.kind === "doorway")
        .map((exit) => (
          <ExitWall
            key={exit.toRoomId}
            exit={exit}
            sign={roomDisplayName(exit.toRoomId)}
            accent={rooms.get(exit.toRoomId)?.theme.palette[0]}
            intro={intro}
          />
        ))}
    </group>
  );
}

/** A hanging lantern: rod, cap, glowing glass and a halo (its light is in RoomLighting). */
function Lantern({ position }: { position: [number, number, number] }) {
  const glow = sharedTextures().glow;
  const rod = WALL_HEIGHT - position[1] - 0.3;
  return (
    <group position={position}>
      <mesh position-y={0.3 + rod / 2} raycast={noRaycast}>
        <cylinderGeometry args={[0.012, 0.012, rod, 6]} />
        <meshStandardMaterial color="#2a241c" metalness={0.5} roughness={0.5} />
      </mesh>
      <mesh position-y={0.27} raycast={noRaycast}>
        <coneGeometry args={[0.2, 0.14, 6]} />
        <meshStandardMaterial color="#2a241c" metalness={0.5} roughness={0.5} />
      </mesh>
      <mesh raycast={noRaycast}>
        <cylinderGeometry args={[0.15, 0.13, 0.4, 6]} />
        <meshBasicMaterial color="#ffd994" toneMapped={false} />
      </mesh>
      <mesh position-y={-0.22} raycast={noRaycast}>
        <cylinderGeometry args={[0.16, 0.12, 0.05, 6]} />
        <meshStandardMaterial color="#2a241c" metalness={0.5} roughness={0.5} />
      </mesh>
      <Billboard>
        <mesh raycast={noRaycast}>
          <planeGeometry args={[1.6, 1.6]} />
          <meshBasicMaterial
            map={glow}
            color="#ffcf80"
            transparent
            opacity={0.45}
            blending={AdditiveBlending}
            depthWrite={false}
          />
        </mesh>
      </Billboard>
    </group>
  );
}
