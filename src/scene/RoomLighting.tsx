import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import type { PointLight } from "three";
import type { RoomTheme } from "../model/types";
import { WALL_HEIGHT } from "../geometry/hexagon";
import { climbState } from "../navigation/climbState";

const CENTRE: [number, number, number][] = [[0, WALL_HEIGHT - 0.6, 0]];

/**
 * Per-culture lighting (§6.4). Kept bright enough to read spines and art. A room
 * has one key light at the centre of its ceiling; the atrium, whose centre is
 * the stair tower, hangs several lanterns instead (`keys`), sharing the same
 * total brightness.
 *
 * During a stair climb (§2.6) both atria are on screen at once, stacked. The
 * room we're leaving keeps the shared hemisphere light; the one we're heading to
 * adds only its key lights ("destination"). The two sets crossfade while the
 * visitor is inside the tower, so each atrium ends up lit exactly as it is on
 * its own and the re-base at the top is invisible.
 */
export function RoomLighting({
  theme,
  role = "main",
  keys = CENTRE,
}: {
  theme: RoomTheme;
  role?: "main" | "destination";
  keys?: [number, number, number][];
}) {
  const lights = useRef<(PointLight | null)[]>([]);
  // Spread the key brightness over the lights (a little extra, since each sits
  // closer to some walls than one central light would).
  const base = (theme.keyLight.intensity * 20 * (keys.length > 1 ? 1.4 : 1)) / keys.length;

  useFrame(() => {
    const k = climbState.light;
    const f = role === "destination" ? k : 1 - k;
    for (const l of lights.current) if (l) l.intensity = base * f;
  });

  return (
    <>
      {role === "main" && (
        <hemisphereLight
          color={theme.keyLight.color}
          groundColor={theme.ambientLight.color}
          intensity={theme.ambientLight.intensity + 0.5}
        />
      )}
      {keys.map((p, i) => (
        <pointLight
          key={i}
          ref={(l) => {
            lights.current[i] = l;
          }}
          color={theme.keyLight.color}
          intensity={role === "destination" ? 0 : base}
          position={p}
          distance={24}
          decay={2}
        />
      ))}
    </>
  );
}
