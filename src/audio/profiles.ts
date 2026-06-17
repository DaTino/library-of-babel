import type { CultureId } from "../model/types";

/**
 * Per-culture ambient audio profile (§6.6). Beds are generated procedurally (a
 * filtered drone-chord + airy noise) rather than sourced files — so they're
 * "owned"/CC0, need no fetching or licensing, and crossfade cleanly.
 */
export interface AudioProfile {
  root: number; // base frequency (Hz)
  intervals: number[]; // frequency multipliers forming the drone chord
  type: OscillatorType;
  cutoff: number; // lowpass cutoff (Hz)
  noise: number; // airy noise gain (0–~0.1)
  gain: number; // bed target gain (0–1)
}

export const AUDIO_PROFILES: Record<CultureId | "atrium", AudioProfile> = {
  egypt: { root: 110, intervals: [1, 1.5, 2], type: "sine", cutoff: 620, noise: 0.04, gain: 0.5 },
  mesoamerica: {
    root: 98,
    intervals: [1, 1.2, 1.5],
    type: "triangle",
    cutoff: 520,
    noise: 0.06,
    gain: 0.5,
  },
  greece: {
    root: 146.83,
    intervals: [1, 1.5, 2],
    type: "sine",
    cutoff: 1150,
    noise: 0.05,
    gain: 0.45,
  },
  china: { root: 130.81, intervals: [1, 1.5, 1.8], type: "sine", cutoff: 820, noise: 0.03, gain: 0.45 },
  renaissance_italy: {
    root: 123.47,
    intervals: [1, 1.25, 1.5],
    type: "triangle",
    cutoff: 700,
    noise: 0.03,
    gain: 0.5,
  },
  tudor_england: {
    root: 110,
    intervals: [1, 1.2, 1.5],
    type: "sine",
    cutoff: 560,
    noise: 0.04,
    gain: 0.5,
  },
  atrium: { root: 130.81, intervals: [1, 1.5], type: "sine", cutoff: 720, noise: 0.05, gain: 0.4 },
};

export function profileForRoom(kind: "atrium" | "themed", culture?: CultureId): AudioProfile {
  if (kind === "themed" && culture) return AUDIO_PROFILES[culture];
  return AUDIO_PROFILES.atrium;
}
