import { useEffect } from "react";
import { useThree } from "@react-three/fiber";
import type { Room } from "../model/types";
import { useMuseumStore } from "../state/store";
import { entryTransform } from "../navigation/entry";

/**
 * Places the camera at the room's entry doorway, facing center, whenever the
 * active room changes (§2.4). Mounts fresh per room (the Scene is keyed by id),
 * so this runs while the screen is faded to black during a transition.
 * PointerLockControls reads the camera's quaternion on the next mouse move, so
 * setting the rotation here continues smoothly with no snap.
 */
export function CameraRig({ room }: { room: Room }) {
  const camera = useThree((s) => s.camera);

  useEffect(() => {
    const { position, yaw } = entryTransform(room, useMuseumStore.getState().entryFromRoomId);
    camera.position.set(position[0], position[1], position[2]);
    camera.rotation.set(0, yaw, 0);
  }, [room, camera]);

  return null;
}
