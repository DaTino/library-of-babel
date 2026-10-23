import { useLayoutEffect } from "react";
import type { Hallway, Room as RoomModel } from "../model/types";
import { hallwayEndIndex } from "../model/deriveMuseum";
import { doorFrame } from "../geometry/hallway";
import { FLOOR_TO_FLOOR } from "../geometry/stairs";
import { activeWalkArea, roomWalkArea } from "../navigation/walkable";
import { useMuseumStore } from "../state/store";
import { Room } from "./Room";
import { Atrium } from "./Atrium";
import { CameraRig } from "./CameraRig";
import { NavTriggers } from "./NavTriggers";
import { Interaction } from "./Interaction";
import { StairClimb } from "./StairClimb";
import { StairTower } from "./props/StairTower";
import { HallwayView } from "./hallway/HallwayView";

/**
 * The active room scene (§2.4): the room itself plus the hallways beyond its
 * doorways (§2.7), all in the room's own frame — no two rooms ever share a
 * coordinate space. Hallways are keyed by id, so the one being walked survives
 * the hand-over to the far room and just re-anchors to that room's doorway.
 *
 * Atria add the stair tower (§2.6). During a climb, the destination atrium is
 * drawn too, stacked one floor up or down — the tower is real, Euclidean
 * geometry, so both floors genuinely coexist until the re-base at the top.
 */
export function Scene({
  room,
  rooms,
  hallways,
  topLevel,
  floorTitles,
}: {
  room: RoomModel;
  rooms: Map<string, RoomModel>;
  hallways: Map<string, Hallway>;
  topLevel: number;
  floorTitles: Map<number, string>;
}) {
  const climb = useMuseumStore((s) => s.climb);
  const dest = climb ? rooms.get(climb.toRoomId) : undefined;
  const titleOf = (r: RoomModel) => floorTitles.get(r.floorLevel) ?? `Floor ${r.floorLevel + 1}`;

  // Swap the walkable area in the same commit as the geometry.
  useLayoutEffect(() => {
    activeWalkArea.current = roomWalkArea(room);
  }, [room]);

  return (
    <>
      {room.kind === "atrium" ? (
        <Atrium key={room.id} room={room} rooms={rooms} floorTitle={titleOf(room)} />
      ) : (
        <Room key={room.id} room={room} floorTitle={titleOf(room)} />
      )}
      <RoomHallways room={room} hallways={hallways} />
      {room.kind === "atrium" && (
        <StairTower atrium={room} topLevel={topLevel} floorTitles={floorTitles} />
      )}

      {climb && dest && (
        <group position-y={climb.dir * FLOOR_TO_FLOOR}>
          <Atrium room={dest} rooms={rooms} floorTitle={titleOf(dest)} role="destination" />
          <RoomHallways room={dest} hallways={hallways} />
        </group>
      )}

      <CameraRig room={room} />
      <NavTriggers room={room} hallways={hallways} />
      <StairClimb room={room} />
      <Interaction />
    </>
  );
}

/** The hallways opening off a room's doorways, each anchored at its doorway. */
function RoomHallways({ room, hallways }: { room: RoomModel; hallways: Map<string, Hallway> }) {
  return (
    <>
      {room.exits.map((exit) => {
        if (exit.wallIndex === undefined || !exit.hallwayId) return null;
        const hallway = hallways.get(exit.hallwayId);
        if (!hallway) return null;
        const end = hallwayEndIndex(hallway, room.id);
        if (end === -1) return null;
        return (
          <HallwayView
            key={hallway.id}
            hallway={hallway}
            frame={doorFrame(exit.wallIndex)}
            end={end}
          />
        );
      })}
    </>
  );
}
