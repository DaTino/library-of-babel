import type { Room } from "../model/types";
import { HexShell } from "./HexShell";
import { RoomLighting } from "./RoomLighting";
import { ExitWall } from "./walls/ExitWall";
import { Staircase } from "./props/Staircase";
import { roomDisplayName } from "../model/labels";

/** The atrium hub (§3.2): hexagonal, all 6 walls are signed/color-cued doorways,
 *  the spiral staircase at the center. */
export function Atrium({ room, rooms }: { room: Room; rooms: Map<string, Room> }) {
  return (
    <group>
      <RoomLighting theme={room.theme} />
      <HexShell room={room} />

      {room.exits
        .filter((exit) => exit.kind === "doorway")
        .map((exit) => (
          <ExitWall
            key={exit.toRoomId}
            exit={exit}
            sign={roomDisplayName(exit.toRoomId)}
            accent={rooms.get(exit.toRoomId)?.theme.palette[0]}
          />
        ))}

      <Staircase exits={room.exits} />
    </group>
  );
}
