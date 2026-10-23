import { useEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { Vector3 } from "three";
import type { Hallway, Room } from "../model/types";
import { hallwayEndIndex } from "../model/deriveMuseum";
import {
  HALL_LENGTH,
  doorFrame,
  hallProgress,
  inHallway,
  shouldSwap,
  toLocal,
  type Frame,
} from "../geometry/hallway";
import { TOWER_DOOR_HALF_ANGLE, TOWER_RADIUS, doorAngle } from "../geometry/stairs";
import { useMuseumStore, type StairPrompt } from "../state/store";
import { climbState } from "../navigation/climbState";

// Facing needed (dot of view with the stair's direction) to step onto a flight.
const STAIR_FACING = 0.35;

interface Door {
  frame: Frame;
  wall: number;
  hallway: Hallway;
  toRoomId: string;
  toWall: number;
}

/**
 * Per-frame navigation checks for the current room:
 *  - Hallways (§2.7): which one the visitor is in and how far along (for the HUD
 *    and the audio blend), and — once they pass its midpoint — hand over to the
 *    room at the far end.
 *  - The stair tower (§2.6): standing in its doorway and turning toward a flight
 *    (left = up, right = down) starts a climb. Clicking a flight also works.
 */
export function NavTriggers({ room, hallways }: { room: Room; hallways: Map<string, Hallway> }) {
  const camera = useThree((s) => s.camera);
  const fwd = useMemo(() => new Vector3(), []);
  // After arriving by the stairs we stand in the doorway: wait until the visitor
  // steps away before the doorway can start another climb.
  const armed = useRef(true);

  const doors = useMemo<Door[]>(() => {
    const list: Door[] = [];
    for (const e of room.exits) {
      if (e.kind !== "doorway" || e.wallIndex === undefined || !e.hallwayId) continue;
      const hallway = hallways.get(e.hallwayId);
      if (!hallway) continue;
      const end = hallwayEndIndex(hallway, room.id);
      if (end < 0) continue;
      list.push({
        frame: doorFrame(e.wallIndex),
        wall: e.wallIndex,
        hallway,
        toRoomId: e.toRoomId,
        toWall: hallway.ends[end === 0 ? 1 : 0].wallIndex,
      });
    }
    return list;
  }, [room, hallways]);

  const stairs = useMemo(() => {
    if (room.kind !== "atrium") return null;
    const up = room.exits.find((e) => e.kind === "staircase-up")?.toRoomId;
    const down = room.exits.find((e) => e.kind === "staircase-down")?.toRoomId;
    if (!up && !down) return null;
    return { up, down, angle: doorAngle(room.floorLevel) };
  }, [room]);

  // Just stepped off the stair? Disarm until we walk away from the doorway.
  useEffect(() => {
    armed.current = !climbState.steppedOff;
    climbState.steppedOff = false;
  }, [room.id]);

  useFrame(() => {
    const st = useMuseumStore.getState();
    // Mid-fade, mid-climb, or a room change not yet committed: hold still.
    if (st.isTraveling || st.climb || st.currentRoomId !== room.id) return;

    const x = camera.position.x;
    const z = camera.position.z;

    // --- hallways ---
    let here: { id: string; otherRoomId: string; t: number } | null = null;
    for (const d of doors) {
      const l = toLocal(d.frame, x, z);
      if (!inHallway(l)) continue;
      if (shouldSwap(l)) {
        st.traverseHallway(d.toRoomId, d.wall, d.toWall);
        return;
      }
      const t = Math.round((hallProgress(l) / HALL_LENGTH) * 100) / 100;
      here = { id: d.hallway.id, otherRoomId: d.toRoomId, t };
      break;
    }
    const cur = st.hallway;
    if (cur?.id !== here?.id || cur?.t !== here?.t) st.setHallway(here);

    // --- stair tower doorway ---
    if (!stairs) {
      if (st.stairPrompt) st.setStairPrompt(null);
      return;
    }
    const r = Math.hypot(x, z);
    const off = Math.atan2(z, x) - stairs.angle;
    const dAng = Math.abs(Math.atan2(Math.sin(off), Math.cos(off)));
    const near = r < TOWER_RADIUS + 1.8 && dAng < 0.7;
    const prompt: StairPrompt = !near
      ? null
      : stairs.up && stairs.down
        ? "both"
        : stairs.up
          ? "up"
          : "down";
    if (prompt !== st.stairPrompt) st.setStairPrompt(prompt);
    if (!near) {
      armed.current = true;
      return;
    }

    const inDoorway = r < TOWER_RADIUS + 0.35 && dAng < TOWER_DOOR_HALF_ANGLE + 0.06;
    if (!inDoorway || !armed.current) return;

    camera.getWorldDirection(fwd);
    const flen = Math.hypot(fwd.x, fwd.z) || 1;
    // Tangent of the rising stair at the doorway (left, facing in).
    const upDot = (fwd.x * -Math.sin(stairs.angle) + fwd.z * Math.cos(stairs.angle)) / flen;
    // Facing into the tower (toward its axis).
    const inDot = (fwd.x * -Math.cos(stairs.angle) + fwd.z * -Math.sin(stairs.angle)) / flen;

    let dir: 1 | -1 | 0 = 0;
    if (stairs.up && stairs.down) dir = upDot > STAIR_FACING ? 1 : upDot < -STAIR_FACING ? -1 : 0;
    else if (stairs.up && (upDot > STAIR_FACING || inDot > 0.5)) dir = 1;
    else if (stairs.down && (upDot < -STAIR_FACING || inDot > 0.5)) dir = -1;
    if (dir === 0) return;

    armed.current = false;
    st.startClimb((dir === 1 ? stairs.up : stairs.down)!, dir);
  });

  return null;
}
