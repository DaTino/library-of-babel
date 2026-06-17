import { describe, expect, it } from "vitest";
import { AUDIO_PROFILES, profileForRoom } from "./profiles";

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
});
