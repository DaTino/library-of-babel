import { useCenterRaycast } from "../interaction/useCenterRaycast";

/** Mounts the center-screen raycaster inside the Canvas (§6.5). */
export function Interaction() {
  useCenterRaycast();
  return null;
}
