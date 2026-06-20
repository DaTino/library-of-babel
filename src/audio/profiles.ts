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
  /**
   * The chord progression this bed slowly drifts through: semitone offsets from
   * `root`, played one chord at a time and looped (§6.6). The whole drone-chord
   * is transposed by each offset, so the room keeps its voicing/timbre while the
   * harmony moves. Index 0 must be 0 (the bed begins on the untransposed root).
   * Omit to fall back to DEFAULT_PROGRESSION.
   */
  progression?: number[];
}

/**
 * Fallback progression for any profile that omits its own (every culture below
 * defines one). I → ♭III → V → IV.
 */
export const DEFAULT_PROGRESSION = [0, 3, 7, 5];

export const AUDIO_PROFILES: Record<CultureId | "atrium", AudioProfile> = {
  // Stately, ancient open fifths — a slow I–IV–V hymn.
  egypt: {
    root: 110,
    intervals: [1, 1.5, 2],
    type: "sine",
    cutoff: 620,
    noise: 0.04,
    gain: 0.5,
    progression: [0, 5, 7],
  },
  // Dark minor triad descending into ritual depths.
  mesoamerica: {
    root: 98,
    intervals: [1, 1.2, 1.5],
    type: "triangle",
    cutoff: 520,
    noise: 0.06,
    gain: 0.5,
    progression: [0, -3, -5],
  },
  // Bright, airy open fifths — a balanced classical sway.
  greece: {
    root: 146.83,
    intervals: [1, 1.5, 2],
    type: "sine",
    cutoff: 1150,
    noise: 0.05,
    gain: 0.45,
    progression: [0, 7, 5, 2],
  },
  // Floating pentatonic drift.
  china: {
    root: 130.81,
    intervals: [1, 1.5, 1.8],
    type: "sine",
    cutoff: 820,
    noise: 0.03,
    gain: 0.45,
    progression: [0, 2, 7, 9],
  },
  // Song-like major movement — the I–vi–IV–V of a polyphonic age.
  renaissance_italy: {
    root: 123.47,
    intervals: [1, 1.25, 1.5],
    type: "triangle",
    cutoff: 700,
    noise: 0.03,
    gain: 0.5,
    progression: [0, 9, 5, 7],
  },
  // A descending minor lament (Dowland-ish melancholy).
  tudor_england: {
    root: 110,
    intervals: [1, 1.2, 1.5],
    type: "sine",
    cutoff: 560,
    noise: 0.04,
    gain: 0.5,
    progression: [0, -2, -4, -5],
  },
  // Austere, sparse modal sway over open fifths.
  mesopotamia: {
    root: 116.54,
    intervals: [1, 1.5],
    type: "triangle",
    cutoff: 580,
    noise: 0.05,
    gain: 0.5,
    progression: [0, 5, 2],
  },
  // Low and brooding, unresolved.
  pacific_northwest: {
    root: 92.5,
    intervals: [1, 1.2, 1.5],
    type: "sine",
    cutoff: 480,
    noise: 0.07,
    gain: 0.5,
    progression: [0, 3, -2],
  },
  // Grand and triumphal — open fifths oscillating on the dominant.
  rome: {
    root: 130.81,
    intervals: [1, 1.5, 2],
    type: "sine",
    cutoff: 1000,
    noise: 0.04,
    gain: 0.45,
    progression: [0, 7, 5, 7],
  },
  // Warm major triads with a gentle rocking lilt.
  mali_songhai: {
    root: 146.83,
    intervals: [1, 1.25, 1.5],
    type: "triangle",
    cutoff: 900,
    noise: 0.04,
    gain: 0.45,
    progression: [0, 2, 5, 2],
  },
  // Restless minor movement, faintly martial.
  napoleonic_france: {
    root: 110,
    intervals: [1, 1.2, 1.5],
    type: "sine",
    cutoff: 700,
    noise: 0.03,
    gain: 0.5,
    progression: [0, -2, 5, 3],
  },
  // Spacious pentatonic, lots of air between chords.
  edo_japan: {
    root: 138.59,
    intervals: [1, 1.5, 1.8],
    type: "sine",
    cutoff: 760,
    noise: 0.03,
    gain: 0.42,
    progression: [0, 5, 2, 7],
  },

  // --- The Lantern Gallery (top floor) ---
  // Big-sky open fifths over a steady drum-like low end.
  plains_lakota: {
    root: 98,
    intervals: [1, 1.5, 2],
    type: "sine",
    cutoff: 540,
    noise: 0.06,
    gain: 0.5,
    progression: [0, 7, 5],
  },
  // Tanpura-like drone with a slow, gentle raga bend.
  ancient_india: {
    root: 130.81,
    intervals: [1, 1.5, 2],
    type: "triangle",
    cutoff: 760,
    noise: 0.03,
    gain: 0.5,
    progression: [0, 3, 2],
  },
  // Stark bare fifths sinking into a cold modal descent.
  viking_norse: {
    root: 87.31,
    intervals: [1, 1.5],
    type: "triangle",
    cutoff: 460,
    noise: 0.06,
    gain: 0.5,
    progression: [0, -2, -5],
  },
  // Shimmering maqam-Hijaz color (the augmented-second step).
  islamic_golden_age: {
    root: 146.83,
    intervals: [1, 1.25, 1.5],
    type: "sine",
    cutoff: 980,
    noise: 0.04,
    gain: 0.45,
    progression: [0, 1, 4],
  },
  // Warm major triads swaying like a choral himene.
  polynesia: {
    root: 130.81,
    intervals: [1, 1.25, 1.5],
    type: "sine",
    cutoff: 900,
    noise: 0.05,
    gain: 0.45,
    progression: [0, 5, 7, 5],
  },
  // Bright parlor-song major — a homey I–IV–vi–V.
  american_19c: {
    root: 110,
    intervals: [1, 1.25, 1.5],
    type: "triangle",
    cutoff: 820,
    noise: 0.03,
    gain: 0.48,
    progression: [0, 5, 9, 7],
  },
  // Neutral hub — the calmest movement, a gentle two-chord breath.
  atrium: {
    root: 130.81,
    intervals: [1, 1.5],
    type: "sine",
    cutoff: 720,
    noise: 0.05,
    gain: 0.4,
    progression: [0, 5],
  },
};

export function profileForRoom(kind: "atrium" | "themed", culture?: CultureId): AudioProfile {
  if (kind === "themed" && culture) return AUDIO_PROFILES[culture];
  return AUDIO_PROFILES.atrium;
}

/** Equal-tempered frequency multiplier for a semitone offset (0 → 1, 12 → 2). */
export function semitoneRatio(semitones: number): number {
  return Math.pow(2, semitones / 12);
}
