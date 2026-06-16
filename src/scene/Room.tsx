import type { Room as RoomModel } from "../model/types";
import { HexShell } from "./HexShell";
import { RoomLighting } from "./RoomLighting";
import { ArtWall } from "./walls/ArtWall";
import { ExitWall } from "./walls/ExitWall";
import { Centerpiece } from "./props/Centerpiece";
import { Benches } from "./props/Benches";

/** Assembles one themed room from its model (§3.1). */
export function Room({ room }: { room: RoomModel }) {
  return (
    <group>
      <RoomLighting theme={room.theme} />
      <HexShell room={room} />

      {room.artWalls.map((wall) => (
        <ArtWall key={wall.wallIndex} wall={wall} theme={room.theme} />
      ))}

      {room.exits
        .filter((exit) => exit.kind === "doorway")
        .map((exit) => (
          <ExitWall key={exit.toRoomId} exit={exit} />
        ))}

      {room.centerpiece && <Centerpiece artwork={room.centerpiece} />}
      <Benches theme={room.theme} />
    </group>
  );
}
