import { describe, expect, it } from "vitest";
import { ATRIUM_THEME, CULTURE_THEMES } from "../data/themes";
import { CULTURE_INTROS, FLOOR_INTROS } from "../data/introductions";
import { FLOORS } from "../config/layout";
import { FLOOR_STYLES, FLOOR_TILE_M, isFloorStyle, isWallStyle } from "./surfaces";
import { labelFor } from "./labelContent";
import { shade } from "./color";

describe("room dressing (§6.4 / §7)", () => {
  it("gives every culture and the atrium a valid floor + wall style", () => {
    for (const [name, theme] of Object.entries({ ...CULTURE_THEMES, atrium: ATRIUM_THEME })) {
      expect(isFloorStyle(theme.materials.floorStyle), `${name} floor`).toBe(true);
      expect(isWallStyle(theme.materials.wallStyle), `${name} wall`).toBe(true);
    }
    for (const s of FLOOR_STYLES) expect(FLOOR_TILE_M[s]).toBeGreaterThan(0);
  });

  it("has introductory wall text for every culture and every floor", () => {
    for (const culture of Object.keys(CULTURE_THEMES) as (keyof typeof CULTURE_INTROS)[]) {
      const intro = CULTURE_INTROS[culture];
      expect(intro.dates, culture).toBeTruthy();
      expect(intro.text.length, culture).toBeGreaterThan(80);
      expect(intro.text.length, culture).toBeLessThan(420); // fits the panel
    }
    for (const f of FLOORS) expect(FLOOR_INTROS[f.id], f.id).toBeDefined();
  });

  it("labels an artwork with its title, maker/date, and credit line", () => {
    const label = labelFor({
      id: "x",
      title: "Shallow bowl",
      creator: "Unknown",
      date: "ca. 3100–2649 B.C.",
      imageUrl: "#",
      thumbUrl: "#",
      source: { provider: "The Metropolitan Museum of Art", providerUrl: "#", license: "CC0" },
    });
    expect(label.title).toBe("Shallow bowl");
    expect(label.lines).toEqual(["Unknown · ca. 3100–2649 B.C."]);
    expect(label.footer).toBe("The Metropolitan Museum of Art · CC0");
    expect(
      labelFor({
        id: "y",
        title: "Specimen",
        imageUrl: "#",
        thumbUrl: "#",
        source: { provider: "P", providerUrl: "#", license: "PD" },
      }).lines,
    ).toEqual([]);
  });

  it("shades trim colors from the wall color", () => {
    expect(shade("#808080", 0.5)).toBe("#404040");
    expect(shade("#ffffff", 2)).toBe("#ffffff");
    expect(shade("not-a-color", 0.5)).toBe("not-a-color");
  });
});
