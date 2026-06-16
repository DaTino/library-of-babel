import { useMemo } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { Vector3 } from "three";
import type { Room } from "../model/types";
import { wallTransform } from "../geometry/hexagon";
import { useMuseumStore } from "../state/store";

const DOOR_DIST = 0.95;
const DOOR_FACING = 0.55; // must be heading toward the door (dot of view vs. direction)
const STAIR_DIST = 1.15;

interface Trigger {
  to: string;
  x: number;
  z: number;
  r: number;
  door: boolean;
}

/**
 * Walking near a doorway (while facing it) or onto the staircase starts a
 * transition (§2.4). Facing is required for doorways so strolling past one
 * along the wall doesn't teleport you.
 */
export function NavTriggers({ room }: { room: Room }) {
  const camera = useThree((s) => s.camera);
  const requestTravel = useMuseumStore((s) => s.requestTravel);
  const fwd = useMemo(() => new Vector3(), []);

  const triggers = useMemo<Trigger[]>(() => {
    const list: Trigger[] = [];
    for (const e of room.exits) {
      if (e.kind === "doorway" && e.wallIndex !== undefined) {
        const t = wallTransform(e.wallIndex);
        list.push({ to: e.toRoomId, x: t.position[0], z: t.position[2], r: DOOR_DIST, door: true });
      } else if (e.kind === "staircase-up" || e.kind === "staircase-down") {
        list.push({ to: e.toRoomId, x: 0, z: 0, r: STAIR_DIST, door: false });
      }
    }
    return list;
  }, [room]);

  useFrame(() => {
    const { isTraveling, overlay } = useMuseumStore.getState();
    if (isTraveling || overlay !== "none") return;

    const cx = camera.position.x;
    const cz = camera.position.z;
    camera.getWorldDirection(fwd);
    const flen = Math.hypot(fwd.x, fwd.z) || 1;

    for (const t of triggers) {
      const dx = t.x - cx;
      const dz = t.z - cz;
      const dist = Math.hypot(dx, dz) || 1;
      if (dist > t.r) continue;
      if (t.door && (fwd.x / flen) * (dx / dist) + (fwd.z / flen) * (dz / dist) < DOOR_FACING) {
        continue;
      }
      requestTravel(t.to);
      break;
    }
  });

  return null;
}
