import { useLayoutEffect } from "react";
import { useThree } from "@react-three/fiber";
import { Quaternion, Vector3 } from "three";
import type { Room } from "../model/types";
import { useMuseumStore } from "../state/store";
import { entryTransform } from "../navigation/entry";
import { doorFrame, swapPose } from "../geometry/hallway";
import { climbState } from "../navigation/climbState";

const UP = new Vector3(0, 1, 0);

/**
 * Places the camera whenever the active room changes. Runs as a layout effect,
 * i.e. in the same commit that swaps the scene, so no frame is ever drawn with
 * the new room and the old pose (or vice versa):
 *  - hallway: the visitor crossed a hallway's midpoint — re-express their pose
 *    in the new room's frame (§2.7). Nothing on screen changes.
 *  - stairs: a climb finished — shift down/up one floor to re-base (§2.6).
 *  - spawn / fade: stand just inside the doorway we came from, facing center.
 * PointerLockControls reads the camera quaternion on the next mouse move, so
 * look continues smoothly.
 */
export function CameraRig({ room }: { room: Room }) {
  const camera = useThree((s) => s.camera);

  useLayoutEffect(() => {
    const { arrival, entryFromRoomId } = useMuseumStore.getState();
    if (arrival.kind === "settled") return;
    useMuseumStore.setState({ arrival: { kind: "settled" } });
    // Whatever brought us here, any climb light crossfade is over — reset it in
    // this same commit so the new room's lights come up exactly as before.
    climbState.light = 0;

    if (arrival.kind === "hallway") {
      const p = swapPose(
        doorFrame(arrival.fromWall),
        doorFrame(arrival.toWall),
        camera.position.x,
        camera.position.z,
      );
      camera.position.x = p.x;
      camera.position.z = p.z;
      camera.quaternion.premultiply(new Quaternion().setFromAxisAngle(UP, p.dYaw));
      return;
    }

    if (arrival.kind === "stairs") {
      camera.position.y += arrival.dy;
      return;
    }

    const { position, yaw } = entryTransform(room, entryFromRoomId);
    camera.position.set(position[0], position[1], position[2]);
    camera.rotation.set(0, yaw, 0);
    // Reposition only on an actual room change, not when content hot-swaps in
    // from the cache (§8) — the room id is stable across that swap.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [room.id, camera]);

  return null;
}
