import { useMemo } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { PointerLockControls } from "@react-three/drei";
import { Vector3 } from "three";
import { EYE_HEIGHT, MAX_WALK_RADIUS } from "../geometry/hexagon";
import { useKeyboard } from "./useKeyboard";
import { useMuseumStore } from "../state/store";

const SPEED = 3.2; // m/s

/** Desktop first-person controller: pointer-lock mouse-look + WASD (§5, Q1). */
export function PlayerControls() {
  const camera = useThree((s) => s.camera);
  const keys = useKeyboard();
  const tmp = useMemo(
    () => ({ forward: new Vector3(), right: new Vector3(), move: new Vector3() }),
    [],
  );

  useFrame((_, delta) => {
    // Movement is locked while a 2D overlay is open (§6.5).
    if (useMuseumStore.getState().overlay !== "none") return;
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

    if (tmp.move.lengthSq() > 0) {
      tmp.move.normalize().multiplyScalar(SPEED * Math.min(delta, 0.1));
      camera.position.x += tmp.move.x;
      camera.position.z += tmp.move.z;
    }

    // Keep the visitor inside the hexagon (clamp to the inscribed circle).
    const horiz = Math.hypot(camera.position.x, camera.position.z);
    if (horiz > MAX_WALK_RADIUS) {
      const k = MAX_WALK_RADIUS / horiz;
      camera.position.x *= k;
      camera.position.z *= k;
    }
    camera.position.y = EYE_HEIGHT;
  });

  return <PointerLockControls makeDefault />;
}
