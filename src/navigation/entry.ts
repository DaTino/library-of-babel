import type { Room } from "../model/types";
import { EYE_HEIGHT } from "../geometry/hexagon";

export interface EntryTransform {
  position: [number, number, number];
  /** Y-rotation so the camera faces the room center on arrival. */
  yaw: number;
}

// Stand a little inside the entry doorway, looking toward the center — far
// enough out to clear the atrium's stair tower (§2.6).
const ENTRY_RADIUS = 4.2;
// First spawn: in the ground-floor atrium, between the tower and a doorway,
// facing that doorway (and the hallway beyond it).
const DEFAULT_ENTRY: EntryTransform = { position: [0, EYE_HEIGHT, 4.2], yaw: Math.PI };

/**
 * Where to place the camera when arriving in `room` by a jump (§2.4) — the first
 * spawn, or R → atrium. We enter at the doorway that leads back to where we came
 * from, standing just inside it and facing the room's center. Hallway and stair
 * arrivals don't come through here: those carry the visitor's pose over
 * continuously (§2.7 / §2.6).
 */
export function entryTransform(room: Room, fromRoomId: string | null): EntryTransform {
  const back = room.exits.find((e) => e.toRoomId === fromRoomId && e.wallIndex !== undefined);
  if (!back || back.wallIndex === undefined) return DEFAULT_ENTRY;

  const phi = ((back.wallIndex * 60 + 30) * Math.PI) / 180;
  const x = ENTRY_RADIUS * Math.cos(phi);
  const z = ENTRY_RADIUS * Math.sin(phi);
  return { position: [x, EYE_HEIGHT, z], yaw: Math.atan2(x, z) };
}
