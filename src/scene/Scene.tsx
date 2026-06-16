import type { Room as RoomModel } from "../model/types";
import { Room } from "./Room";
import { Atrium } from "./Atrium";
import { CameraRig } from "./CameraRig";
import { NavTriggers } from "./NavTriggers";
import { Interaction } from "./Interaction";

/** The active room scene (§2.4). Mounted keyed by room id, so it fully unmounts
 *  and disposes on travel — no two rooms ever share a coordinate space. */
export function Scene({ room, rooms }: { room: RoomModel; rooms: Map<string, RoomModel> }) {
  return (
    <>
      {room.kind === "atrium" ? <Atrium room={room} rooms={rooms} /> : <Room room={room} />}
      <CameraRig room={room} />
      <NavTriggers room={room} />
      <Interaction />
    </>
  );
}
