import type { RoomTheme } from "../model/types";
import { WALL_HEIGHT } from "../geometry/hexagon";

/** Per-culture lighting (§6.4). Kept bright enough to read spines and art. */
export function RoomLighting({ theme }: { theme: RoomTheme }) {
  return (
    <>
      <hemisphereLight
        color={theme.keyLight.color}
        groundColor={theme.ambientLight.color}
        intensity={theme.ambientLight.intensity + 0.5}
      />
      <pointLight
        color={theme.keyLight.color}
        intensity={theme.keyLight.intensity * 20}
        position={[0, WALL_HEIGHT - 0.6, 0]}
        distance={24}
        decay={2}
      />
    </>
  );
}
