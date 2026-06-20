import { describe, expect, it } from "vitest";
import { AUDIO_PROFILES, DEFAULT_PROGRESSION, profileForRoom, semitoneRatio } from "./profiles";

describe("audio profiles", () => {
  it("has a profile for every culture plus the atrium", () => {
    const keys = [
      "egypt",
      "mesoamerica",
      "greece",
      "china",
      "renaissance_italy",
      "tudor_england",
      "mesopotamia",
      "pacific_northwest",
      "rome",
      "mali_songhai",
      "napoleonic_france",
      "edo_japan",
      "atrium",
    ] as const;
    for (const k of keys) expect(AUDIO_PROFILES[k]).toBeDefined();
  });

  it("picks the culture bed for themed rooms and the atrium bed otherwise", () => {
    expect(profileForRoom("themed", "greece")).toBe(AUDIO_PROFILES.greece);
    expect(profileForRoom("atrium")).toBe(AUDIO_PROFILES.atrium);
    expect(profileForRoom("themed")).toBe(AUDIO_PROFILES.atrium);
  });

  it("gives every culture its own valid progression", () => {
    for (const [name, profile] of Object.entries(AUDIO_PROFILES)) {
      const prog = profile.progression ?? DEFAULT_PROGRESSION;
      expect(prog.length, `${name} has more than one chord`).toBeGreaterThan(1);
      expect(prog[0], `${name} starts on the untransposed root`).toBe(0);
      expect(new Set(prog).size, `${name} actually moves`).toBeGreaterThan(1);
    }
  });

  it("varies the movement across cultures (not one shared progression)", () => {
    const shapes = Object.values(AUDIO_PROFILES).map((p) =>
      (p.progression ?? DEFAULT_PROGRESSION).join(","),
    );
    expect(new Set(shapes).size).toBeGreaterThan(1);
  });

  it("falls back to the default progression when a profile omits one", () => {
    expect(DEFAULT_PROGRESSION.length).toBeGreaterThan(1);
    expect(DEFAULT_PROGRESSION[0]).toBe(0);
  });

  it("transposes by equal-tempered semitones", () => {
    expect(semitoneRatio(0)).toBe(1);
    expect(semitoneRatio(12)).toBeCloseTo(2);
    expect(semitoneRatio(7)).toBeCloseTo(1.4983, 3); // a fifth
  });
});
