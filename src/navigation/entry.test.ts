import { describe, expect, it } from "vitest";
import { museum } from "../data/placeholder";
import { roomsById } from "../model/deriveMuseum";
import { entryTransform } from "./entry";
import { EYE_HEIGHT } from "../geometry/hexagon";

const rooms = roomsById(museum);

describe("entryTransform", () => {
  it("uses a default entry when there is no known origin", () => {
    const e = entryTransform(rooms.get("floor-1:atrium")!, null);
    expect(e.position[1]).toBeCloseTo(EYE_HEIGHT, 5);
  });

  it("enters just inside, facing the room center, when arriving from a neighbor", () => {
    const e = entryTransform(rooms.get("floor-1:egypt")!, "floor-1:atrium");
    const [x, y, z] = e.position;
    expect(y).toBeCloseTo(EYE_HEIGHT, 5);

    const radius = Math.hypot(x, z);
    expect(radius).toBeGreaterThan(0.5);
    expect(radius).toBeLessThan(3); // inside the hexagon

    // forward (from yaw) should point at the center
    const fx = -Math.sin(e.yaw);
    const fz = -Math.cos(e.yaw);
    expect(fx * (-x / radius) + fz * (-z / radius)).toBeCloseTo(1, 5);
  });
});
