import { DEFAULT_PROGRESSION, semitoneRatio, type AudioProfile } from "./profiles";

interface Bed {
  gain: GainNode;
  stop: () => void;
  /** Pending teardown once faded out (cleared if the bed is wanted again). */
  stopTimer: number | null;
}

/** One bed in the mix: which profile, and how loud relative to its own level. */
export interface MixEntry {
  key: string;
  profile: AudioProfile;
  weight: number;
}

const BED_LEVEL = 0.6; // global scalar on every bed's gain — keeps the ambience quiet
const CHORD_DUR = 12; // seconds each chord in the progression is held
const CHORD_GLIDE = 3.5; // seconds to glide between chords (portamento, stays ambient)

/**
 * Procedural ambient audio (§6.6). One generated "bed" per room (drone chord +
 * slow filter LFO + airy noise). The engine plays a weighted *mix* of beds:
 * normally just the current room's, but while walking a hallway (§2.7) the two
 * rooms it joins blend by how far along it you are. Beds are built on demand,
 * faded with a short time constant, and torn down once silent. The AudioContext
 * is created on the first user gesture (autoplay policy). A single master gain
 * handles muting.
 */
class AudioEngine {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private beds = new Map<string, Bed>();
  private muted = false;
  private started = false;

  isStarted(): boolean {
    return this.started;
  }

  start(): void {
    if (this.started) return;
    const Ctor =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return;
    this.ctx = new Ctor();
    this.master = this.ctx.createGain();
    this.master.gain.value = this.muted ? 0 : 1;
    this.master.connect(this.ctx.destination);
    void this.ctx.resume();
    this.started = true;
  }

  setMuted(muted: boolean): void {
    this.muted = muted;
    if (!this.ctx || !this.master) return;
    const t = this.ctx.currentTime;
    this.master.gain.cancelScheduledValues(t);
    this.master.gain.setValueAtTime(this.master.gain.value, t);
    this.master.gain.linearRampToValueAtTime(muted ? 0 : 1, t + 0.3);
  }

  /**
   * Fade toward a weighted mix of beds. `smoothing` is the fade's time constant
   * in seconds (≈3× that to settle): short while walking a hallway, so the blend
   * tracks your steps; longer for a jump (R → atrium), a gentle crossfade.
   */
  setMix(entries: MixEntry[], smoothing = 0.15): void {
    if (!this.ctx || !this.master) return;
    const t = this.ctx.currentTime;
    const wanted = new Map(entries.filter((e) => e.weight > 0.001).map((e) => [e.key, e]));

    for (const [key, e] of wanted) {
      let bed = this.beds.get(key);
      if (!bed) {
        bed = this.buildBed(e.profile);
        this.beds.set(key, bed);
      }
      if (bed.stopTimer !== null) {
        window.clearTimeout(bed.stopTimer);
        bed.stopTimer = null;
      }
      this.fadeTo(bed, e.profile.gain * BED_LEVEL * e.weight, t, smoothing);
    }

    for (const [key, bed] of this.beds) {
      if (wanted.has(key) || bed.stopTimer !== null) continue;
      this.fadeTo(bed, 0, t, smoothing);
      bed.stopTimer = window.setTimeout(
        () => {
          bed.stop();
          this.beds.delete(key);
        },
        smoothing * 8 * 1000 + 200,
      );
    }
  }

  private fadeTo(bed: Bed, target: number, t: number, smoothing: number): void {
    const g = bed.gain.gain;
    g.cancelScheduledValues(t);
    g.setValueAtTime(g.value, t);
    g.setTargetAtTime(target, t, smoothing);
  }

  private buildBed(profile: AudioProfile): Bed {
    const ctx = this.ctx!;
    const bedGain = ctx.createGain();
    bedGain.gain.value = 0;
    bedGain.connect(this.master!);

    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = profile.cutoff;
    filter.Q.value = 0.6;
    filter.connect(bedGain);

    // Slow LFO drifting the cutoff so the bed breathes.
    const lfo = ctx.createOscillator();
    lfo.frequency.value = 0.06;
    const lfoGain = ctx.createGain();
    lfoGain.gain.value = profile.cutoff * 0.3;
    lfo.connect(lfoGain);
    lfoGain.connect(filter.frequency);
    lfo.start();

    const oscs = profile.intervals.map((mult, i) => {
      const o = ctx.createOscillator();
      o.type = profile.type;
      o.frequency.value = profile.root * mult; // chord step 0 (no transposition)
      o.detune.value = (i - 1) * 5; // gentle chorus
      o.connect(filter);
      o.start();
      return o;
    });

    // Walk this culture's chord progression: every CHORD_DUR seconds, glide each
    // voice to the next chord (the whole drone transposed by a semitone offset).
    const progression = profile.progression ?? DEFAULT_PROGRESSION;
    let step = 0;
    const progress = window.setInterval(() => {
      step = (step + 1) % progression.length;
      const transpose = semitoneRatio(progression[step]);
      const now = ctx.currentTime;
      oscs.forEach((o, i) => {
        const target = profile.root * profile.intervals[i] * transpose;
        o.frequency.cancelScheduledValues(now);
        o.frequency.setValueAtTime(o.frequency.value, now);
        o.frequency.linearRampToValueAtTime(target, now + CHORD_GLIDE);
      });
    }, CHORD_DUR * 1000);

    let noise: AudioBufferSourceNode | null = null;
    if (profile.noise > 0) {
      const buffer = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
      noise = ctx.createBufferSource();
      noise.buffer = buffer;
      noise.loop = true;
      const nf = ctx.createBiquadFilter();
      nf.type = "bandpass";
      nf.frequency.value = profile.cutoff * 1.5;
      const ng = ctx.createGain();
      ng.gain.value = profile.noise;
      noise.connect(nf);
      nf.connect(ng);
      ng.connect(bedGain);
      noise.start();
    }

    const stop = () => {
      window.clearInterval(progress);
      try {
        oscs.forEach((o) => o.stop());
        lfo.stop();
        noise?.stop();
      } catch {
        /* already stopped */
      }
      oscs.forEach((o) => o.disconnect());
      lfoGain.disconnect();
      filter.disconnect();
      noise?.disconnect();
      bedGain.disconnect();
    };

    return { gain: bedGain, stop, stopTimer: null };
  }
}

export const audioEngine = new AudioEngine();
