import type { Room as RoomModel } from "../model/types";
import { HexShell } from "./HexShell";
import { RoomLighting } from "./RoomLighting";
import { ArtWall } from "./walls/ArtWall";
import { ExitWall, type IntroText } from "./walls/ExitWall";
import { Centerpiece } from "./props/Centerpiece";
import { Benches } from "./props/Benches";
import { CULTURE_INTROS } from "../data/introductions";

/** Assembles one themed room from its model (§3.1), with its introductory wall
 *  text beside every doorway (§7.4). */
export function Room({ room, floorTitle }: { room: RoomModel; floorTitle: string }) {
  const intro: IntroText | undefined = room.culture
    ? { heading: floorTitle, title: room.title, ...CULTURE_INTROS[room.culture] }
    : undefined;
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
          <ExitWall key={exit.toRoomId} exit={exit} intro={intro} />
        ))}

      {room.centerpiece && <Centerpiece artwork={room.centerpiece} />}
      <Benches theme={room.theme} />
    </group>
  );
}
