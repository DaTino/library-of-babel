import { describe, expect, it } from "vitest";
import { museum } from "../data/placeholder";
import { roomsById } from "../model/deriveMuseum";
import { entryTransform } from "./entry";
import { EYE_HEIGHT, MAX_WALK_RADIUS, PLAYER_RADIUS } from "../geometry/hexagon";
import { TOWER_RADIUS } from "../geometry/stairs";
import { isWalkable, roomWalkArea } from "./walkable";

const rooms = roomsById(museum);

describe("entryTransform", () => {
  it("uses a default entry when there is no known origin", () => {
    const e = entryTransform(rooms.get("floor-1:atrium")!, null);
    expect(e.position[1]).toBeCloseTo(EYE_HEIGHT, 5);
  });

  it("spawns on walkable floor, clear of the atrium's stair tower", () => {
    const atrium = rooms.get("floor-1:atrium")!;
    const [x, , z] = entryTransform(atrium, null).position;
    expect(Math.hypot(x, z)).toBeGreaterThan(TOWER_RADIUS + PLAYER_RADIUS);
    expect(isWalkable(roomWalkArea(atrium), x, z)).toBe(true);
  });

  it("enters the atrium (R key) on walkable floor outside the tower", () => {
    const atrium = rooms.get("floor-1:atrium")!;
    const [x, , z] = entryTransform(atrium, "floor-1:egypt").position;
    expect(isWalkable(roomWalkArea(atrium), x, z)).toBe(true);
  });

  it("enters just inside, facing the room center, when arriving from a neighbor", () => {
    const e = entryTransform(rooms.get("floor-1:egypt")!, "floor-1:atrium");
    const [x, y, z] = e.position;
    expect(y).toBeCloseTo(EYE_HEIGHT, 5);

    const radius = Math.hypot(x, z);
    expect(radius).toBeGreaterThan(0.5);
    expect(radius).toBeLessThanOrEqual(MAX_WALK_RADIUS); // inside the hexagon

    // forward (from yaw) should point at the center
    const fx = -Math.sin(e.yaw);
    const fz = -Math.cos(e.yaw);
    expect(fx * (-x / radius) + fz * (-z / radius)).toBeCloseTo(1, 5);
  });
});
