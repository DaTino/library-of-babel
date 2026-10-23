import { useMemo } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { PointerLockControls } from "@react-three/drei";
import { Vector3 } from "three";
import { EYE_HEIGHT, MAX_WALK_RADIUS } from "../geometry/hexagon";
import { activeWalkArea, clampToWalkArea } from "../navigation/walkable";
import { useKeyboard } from "./useKeyboard";
import { useMuseumStore } from "../state/store";

const SPEED = 3.2; // m/s

/** Desktop first-person controller: pointer-lock mouse-look + WASD (§5, Q1).
 *  Movement is clamped to the current room's walkable area — its floor, its
 *  doorways and the hallways beyond them (§2.7). Mouse-look stays live during a
 *  stair climb, whose position is scripted (§2.6). */
export function PlayerControls() {
  const camera = useThree((s) => s.camera);
  const keys = useKeyboard();
  const tmp = useMemo(
    () => ({ forward: new Vector3(), right: new Vector3(), move: new Vector3() }),
    [],
  );

  useFrame((_, delta) => {
    // Locked while an overlay is open, mid-fade, mid-climb, or while a room
    // change is waiting to be applied (§6.5 / §2.4 / §2.6 / §2.7).
    const nav = useMuseumStore.getState();
    if (nav.overlay !== "none" || nav.isTraveling || nav.climb || nav.arrival.kind !== "settled")
      return;
    const { forward, back, left, right } = keys.current;

    camera.getWorldDirection(tmp.forward);
    tmp.forward.y = 0;
    if (tmp.forward.lengthSq() > 0) tmp.forward.normalize();
    tmp.right.crossVectors(tmp.forward, camera.up).normalize();

    tmp.move.set(0, 0, 0);
    if (forward) tmp.move.add(tmp.forward);
    if (back) tmp.move.sub(tmp.forward);
    if (right) tmp.move.add(tmp.right);
    if (left) tmp.move.sub(tmp.right);
    if (tmp.move.lengthSq() > 0) tmp.move.normalize().multiplyScalar(SPEED * Math.min(delta, 0.1));

    const prevX = camera.position.x;
    const prevZ = camera.position.z;
    const nx = prevX + tmp.move.x;
    const nz = prevZ + tmp.move.z;

    const area = activeWalkArea.current;
    if (area) {
      const p = clampToWalkArea(area, nx, nz, prevX, prevZ);
      camera.position.x = p.x;
      camera.position.z = p.z;
    } else {
      // No area yet (first frame): keep inside the hexagon's inscribed circle.
      const horiz = Math.hypot(nx, nz);
      const k = horiz > MAX_WALK_RADIUS ? MAX_WALK_RADIUS / horiz : 1;
      camera.position.x = nx * k;
      camera.position.z = nz * k;
    }
    camera.position.y = EYE_HEIGHT;
  });

  return <PointerLockControls makeDefault />;
}
