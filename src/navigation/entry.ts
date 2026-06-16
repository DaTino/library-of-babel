import type { Room } from "../model/types";
import { EYE_HEIGHT } from "../geometry/hexagon";

export interface EntryTransform {
  position: [number, number, number];
  /** Y-rotation so the camera faces the room center on arrival. */
  yaw: number;
}

// Stand a little inside the entry doorway, looking toward the center.
const ENTRY_RADIUS = 2.4;
const DEFAULT_ENTRY: EntryTransform = { position: [0, EYE_HEIGHT, 2.2], yaw: 0 };

/**
 * Where to place the camera when arriving in `room` from `fromRoomId` (§2.4).
 * We enter at the doorway that leads back to where we came from, standing just
 * inside it and facing the room's center. Staircase arrivals (and the initial
 * spawn) use a sensible default near the center.
 */
export function entryTransform(room: Room, fromRoomId: string | null): EntryTransform {
  const back = room.exits.find((e) => e.toRoomId === fromRoomId && e.wallIndex !== undefined);
  if (!back || back.wallIndex === undefined) return DEFAULT_ENTRY;

  const phi = ((back.wallIndex * 60 + 30) * Math.PI) / 180;
  const x = ENTRY_RADIUS * Math.cos(phi);
  const z = ENTRY_RADIUS * Math.sin(phi);
  return { position: [x, EYE_HEIGHT, z], yaw: Math.atan2(x, z) };
}
