import { PlayerControls } from "./PlayerControls";

/**
 * Active camera controller — the swappable seam (§5, Q7). Scene code mounts
 * <ActiveControls/> only and never references a concrete controller, so a
 * future WebXR controller can drop in here without touching the scene.
 */
export function ActiveControls() {
  return <PlayerControls />;
}
