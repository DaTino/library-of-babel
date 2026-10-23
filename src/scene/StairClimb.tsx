import { useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { Euler, Quaternion, Vector3 } from "three";
import type { Room } from "../model/types";
import { EYE_HEIGHT } from "../geometry/hexagon";
import {
  FLOOR_TO_FLOOR,
  STAIR_PATH_RADIUS,
  TOWER_RADIUS,
  doorAngle,
  floorClimbLength,
  landingAngle,
  stairHeight,
} from "../geometry/stairs";
import { climbState } from "../navigation/climbState";
import { useMuseumStore } from "../state/store";

const UP = new Vector3(0, 1, 0);
const APPROACH_SPEED = 2.2; // m/s — into the doorway, onto the landing
const CLIMB_SPEED = 2.9; // m/s along the walking line of the stair
const EXIT_TIME = 1.3; // s — step off the far landing, out through its doorway

const smooth = (x: number) => {
  const t = Math.min(1, Math.max(0, x));
  return t * t * (3 - 2 * t);
};
const wrap = (a: number) => Math.atan2(Math.sin(a), Math.cos(a));
/** Camera yaw that looks along the stair (rising for dir 1, falling for −1). */
const pathYaw = (phi: number, dir: 1 | -1) => (dir > 0 ? Math.PI - phi : -phi);
/** Camera yaw that looks radially outward from the tower at angle `a`. */
const outwardYaw = (a: number) => Math.atan2(-Math.cos(a), -Math.sin(a));

interface Plan {
  t: number;
  level: number;
  dir: 1 | -1;
  path: { x: number; z: number }[]; // approach polyline, ending on the landing
  pathLen: number;
  phi0: number;
  phi1: number;
  lastPhi: number;
  tA: number;
  tB: number;
  tC: number;
}

/**
 * Walks the visitor up or down the spiral stair (§2.6, Q13) — a real walk through
 * the tower, both atria on screen, instead of a fade. Position is scripted; look
 * stays free: the body turns with the spiral and mouse-look is layered on top,
 * so the visitor can glance around without fighting the camera. When the far
 * landing is reached, the store re-bases into the destination atrium.
 */
export function StairClimb({ room }: { room: Room }) {
  const camera = useThree((s) => s.camera);
  const plan = useRef<Plan | null>(null);
  const euler = useMemo(() => new Euler(0, 0, 0, "YXZ"), []);
  const q = useMemo(() => new Quaternion(), []);

  useFrame((_, rawDt) => {
    const st = useMuseumStore.getState();
    const climb = st.climb;
    if (!climb || st.currentRoomId !== room.id) {
      plan.current = null;
      return;
    }
    const dt = Math.min(rawDt, 0.1);

    const rotateYaw = (d: number) => {
      q.setFromAxisAngle(UP, d);
      camera.quaternion.premultiply(q);
    };
    const turnToward = (target: number, rate: number) => {
      euler.setFromQuaternion(camera.quaternion, "YXZ");
      rotateYaw(wrap(target - euler.y) * (1 - Math.exp(-rate * dt)));
    };

    if (!plan.current) {
      const level = room.floorLevel;
      const a = doorAngle(level);
      const start = { x: camera.position.x, z: camera.position.z };
      const door = {
        x: (TOWER_RADIUS + 0.25) * Math.cos(a),
        z: (TOWER_RADIUS + 0.25) * Math.sin(a),
      };
      const landing = { x: STAIR_PATH_RADIUS * Math.cos(a), z: STAIR_PATH_RADIUS * Math.sin(a) };
      // Go via the doorway when starting outside it, so we never cut through the wall.
      const path =
        Math.hypot(start.x, start.z) > TOWER_RADIUS + 0.25
          ? [start, door, landing]
          : [start, landing];
      let pathLen = 0;
      for (let i = 1; i < path.length; i++)
        pathLen += Math.hypot(path[i].x - path[i - 1].x, path[i].z - path[i - 1].z);
      plan.current = {
        t: 0,
        level,
        dir: climb.dir,
        path,
        pathLen,
        phi0: landingAngle(level),
        phi1: landingAngle(level + climb.dir),
        lastPhi: landingAngle(level),
        tA: Math.max(0.7, pathLen / APPROACH_SPEED),
        tB: floorClimbLength() / CLIMB_SPEED,
        tC: EXIT_TIME,
      };
    }

    const p = plan.current;
    p.t += dt;
    const base = p.level * FLOOR_TO_FLOOR;

    if (p.t < p.tA) {
      // A — into the doorway and onto the landing, turning toward the flight.
      const target = smooth(p.t / p.tA) * p.pathLen;
      let acc = 0;
      for (let i = 1; i < p.path.length; i++) {
        const a = p.path[i - 1];
        const b = p.path[i];
        const seg = Math.hypot(b.x - a.x, b.z - a.z);
        if (acc + seg >= target || i === p.path.length - 1) {
          const k = seg > 0 ? Math.min(1, (target - acc) / seg) : 1;
          camera.position.set(a.x + (b.x - a.x) * k, EYE_HEIGHT, a.z + (b.z - a.z) * k);
          break;
        }
        acc += seg;
      }
      turnToward(pathYaw(p.phi0, p.dir), 3);
      return;
    }

    if (p.t < p.tA + p.tB) {
      // B — the climb itself: ease along the helix, body turning with it.
      const s = (p.t - p.tA) / p.tB;
      const v = 0.5 - 0.5 * Math.cos(Math.PI * s);
      const phi = p.phi0 + (p.phi1 - p.phi0) * v;
      camera.position.set(
        STAIR_PATH_RADIUS * Math.cos(phi),
        stairHeight(phi) - base + EYE_HEIGHT,
        STAIR_PATH_RADIUS * Math.sin(phi),
      );
      rotateYaw(-(phi - p.lastPhi));
      p.lastPhi = phi;
      // Crossfade the two atria's key lights while we're deep in the tower.
      climbState.light = smooth((v - 0.35) / 0.3);
      return;
    }

    if (p.t < p.tA + p.tB + p.tC) {
      // C — step off the far landing and out through its doorway.
      const w = smooth((p.t - p.tA - p.tB) / p.tC);
      const a = p.phi1;
      const r = STAIR_PATH_RADIUS + (TOWER_RADIUS + 0.9 - STAIR_PATH_RADIUS) * w;
      camera.position.set(r * Math.cos(a), p.dir * FLOOR_TO_FLOOR + EYE_HEIGHT, r * Math.sin(a));
      climbState.light = 1;
      turnToward(outwardYaw(a), 3.5);
      return;
    }

    // Arrived: re-base into the destination atrium (CameraRig shifts the camera
    // in the same commit that swaps the scene).
    plan.current = null;
    climbState.steppedOff = true;
    st.finishClimb(FLOOR_TO_FLOOR);
  });

  return null;
}
