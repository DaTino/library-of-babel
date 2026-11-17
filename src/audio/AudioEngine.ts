import type { MusicTrack } from "../model/types";
import { DEFAULT_PROGRESSION, semitoneRatio, type AudioProfile } from "./profiles";

/** A playing voice in the mix: a generated bed, or a streamed playlist. */
interface Voice {
  gain: GainNode;
  /** Where its gain is heading (0 = fading out / silent). */
  target: number;
  /** Pending pause/teardown once faded out (cleared if wanted again). */
  idleTimer: number | null;
  /** A playlist that has faded out and paused, keeping its place. */
  idle: boolean;
  lastUsed: number;
  stop: () => void;
  music?: {
    pause: () => void;
    resume: () => void;
    current: () => MusicTrack;
  };
}

/** One voice in the mix and how loud, relative to its own level. With a
 *  `playlist`, it's recorded music (§6.6, §8.7) streamed in order and looped;
 *  otherwise the generated bed for `profile`. */
export interface MixEntry {
  key: string;
  weight: number;
  profile?: AudioProfile;
  playlist?: MusicTrack[];
}

/** What's audible now, for the HUD's "now playing" line. */
export interface NowPlaying {
  title: string;
  creator?: string;
}

/** Recorded music sits under full scale: it's background in a museum. */
const TRACK_LEVEL = 0.55;
const BED_LEVEL = 0.6; // global scalar on every bed's gain — keeps the ambience quiet
const CHORD_DUR = 12; // seconds each chord in the progression is held
const CHORD_GLIDE = 3.5; // seconds to glide between chords (portamento, stays ambient)
/** Paused playlists kept around (so returning to a room resumes its music). */
const MAX_IDLE_PLAYLISTS = 6;

/**
 * Ambient audio (§6.6). The engine plays a weighted *mix* of voices: normally
 * just the current room's, but while walking a hallway (§2.7) the room you're
 * leaving, the house music and the room ahead blend by how far along you are.
 *
 * A voice is either a recorded playlist — streamed through an <audio> element
 * (so a long piece never sits decoded in memory), played track after track and
 * looped — or, when there's no music at all, a generated drone bed. Playlists
 * that fade out are paused, not discarded, so walking back into a room picks
 * its music up where it left off; beds are torn down. The AudioContext is
 * created on the first user gesture (autoplay policy). Everything runs through
 * a gentle compressor (recordings vary a lot in level) and a master gain that
 * handles muting.
 */
class AudioEngine {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private bus: AudioNode | null = null;
  private voices = new Map<string, Voice>();
  private muted = false;
  private started = false;
  private nowPlaying: NowPlaying | null = null;
  private listeners = new Set<(np: NowPlaying | null) => void>();

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
    const comp = this.ctx.createDynamicsCompressor();
    comp.threshold.value = -22;
    comp.knee.value = 18;
    comp.ratio.value = 3;
    comp.attack.value = 0.03;
    comp.release.value = 0.4;
    comp.connect(this.master);
    this.bus = comp;
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
    // Don't keep streaming music nobody can hear; pick it back up on unmute.
    for (const v of this.voices.values()) {
      if (!v.music) continue;
      if (muted) window.setTimeout(() => this.muted && v.music?.pause(), 400);
      else if (v.target > 0) v.music.resume();
    }
  }

  /** Follow what's audible (the loudest playlist's current track). */
  onNowPlaying(cb: (np: NowPlaying | null) => void): () => void {
    this.listeners.add(cb);
    cb(this.nowPlaying);
    return () => {
      this.listeners.delete(cb);
    };
  }

  /**
   * Fade toward a weighted mix. `smoothing` is the fade's time constant in
   * seconds (≈3× that to settle): short while walking a hallway, so the blend
   * tracks your steps; longer for a jump (R → atrium), a gentle crossfade.
   */
  setMix(entries: MixEntry[], smoothing = 0.15): void {
    if (!this.ctx || !this.master) return;
    const t = this.ctx.currentTime;
    const now = performance.now();
    const wanted = new Map(entries.filter((e) => e.weight > 0.001).map((e) => [e.key, e]));

    for (const [key, e] of wanted) {
      let v = this.voices.get(key);
      if (!v) {
        if (e.playlist?.length) v = this.buildPlaylist(e.playlist);
        else if (e.profile) v = this.buildBed(e.profile);
        else continue;
        this.voices.set(key, v);
      }
      if (v.idleTimer !== null) {
        window.clearTimeout(v.idleTimer);
        v.idleTimer = null;
      }
      v.idle = false;
      v.lastUsed = now;
      if (!this.muted) v.music?.resume();
      const level = e.playlist?.length ? TRACK_LEVEL : (e.profile?.gain ?? 0) * BED_LEVEL;
      this.fadeTo(v, level * e.weight, t, smoothing);
    }

    for (const [key, v] of this.voices) {
      if (wanted.has(key) || v.idle || v.idleTimer !== null) continue;
      this.fadeTo(v, 0, t, smoothing);
      v.idleTimer = window.setTimeout(
        () => {
          v.idleTimer = null;
          if (v.music) {
            v.music.pause();
            v.idle = true;
            this.trimIdle();
          } else {
            v.stop();
            this.voices.delete(key);
          }
        },
        smoothing * 8 * 1000 + 200,
      );
    }
    this.updateNowPlaying();
  }

  private fadeTo(v: Voice, target: number, t: number, smoothing: number): void {
    v.target = target;
    const g = v.gain.gain;
    g.cancelScheduledValues(t);
    g.setValueAtTime(g.value, t);
    g.setTargetAtTime(target, t, smoothing);
  }

  /** Keep only the most recently heard paused playlists. */
  private trimIdle(): void {
    const idle = [...this.voices]
      .filter(([, v]) => v.idle)
      .sort((a, b) => b[1].lastUsed - a[1].lastUsed);
    for (const [key, v] of idle.slice(MAX_IDLE_PLAYLISTS)) {
      v.stop();
      this.voices.delete(key);
    }
  }

  private updateNowPlaying(): void {
    let best: Voice | null = null;
    for (const v of this.voices.values()) {
      if (v.music && v.target > 0.05 && (!best || v.target > best.target)) best = v;
    }
    const track = best?.music?.current();
    const np = track ? { title: track.title, creator: track.creator } : null;
    if (np?.title === this.nowPlaying?.title && np?.creator === this.nowPlaying?.creator) return;
    this.nowPlaying = np;
    for (const cb of this.listeners) cb(np);
  }

  /**
   * A playlist streamed through one <audio> element (same-origin files, §8):
   * each track at its own volume, then the next, looping back to the first. A
   * track that fails to load is skipped; if none load, it stays silent.
   */
  private buildPlaylist(tracks: MusicTrack[]): Voice {
    const ctx = this.ctx!;
    const gain = ctx.createGain();
    gain.gain.value = 0;
    gain.connect(this.bus!);
    const trackGain = ctx.createGain();
    trackGain.connect(gain);

    const audio = new Audio();
    audio.preload = "auto";
    const source = ctx.createMediaElementSource(audio);
    source.connect(trackGain);

    let index = 0;
    let failures = 0;
    let wantPlaying = false;
    const play = () => {
      audio.play().catch((e: unknown) => {
        // Interrupted by a pause or a track change: harmless. Anything else, say so.
        if ((e as Error)?.name !== "AbortError") console.warn("[audio] can't play yet:", e);
      });
    };
    const load = (i: number) => {
      index = i;
      const track = tracks[i];
      trackGain.gain.value = Math.min(1, Math.max(0, track.volume));
      audio.loop = tracks.length === 1;
      audio.src = track.url;
      if (wantPlaying) play();
      this.updateNowPlaying();
    };
    audio.addEventListener("ended", () => load((index + 1) % tracks.length));
    audio.addEventListener("playing", () => (failures = 0));
    audio.addEventListener("error", () => {
      console.warn(`[audio] couldn't load ${tracks[index].url}`);
      if (++failures >= tracks.length) return; // nothing playable — stay silent
      window.setTimeout(() => load((index + 1) % tracks.length), 500);
    });
    load(0);

    return {
      gain,
      target: 0,
      idleTimer: null,
      idle: false,
      lastUsed: performance.now(),
      stop: () => {
        wantPlaying = false;
        audio.pause();
        audio.removeAttribute("src");
        audio.load();
        source.disconnect();
        trackGain.disconnect();
        gain.disconnect();
      },
      music: {
        pause: () => {
          wantPlaying = false;
          audio.pause();
        },
        resume: () => {
          wantPlaying = true;
          if (audio.paused && failures < tracks.length) play();
        },
        current: () => tracks[index],
      },
    };
  }

  private buildBed(profile: AudioProfile): Voice {
    const ctx = this.ctx!;
    const bedGain = ctx.createGain();
    bedGain.gain.value = 0;
    bedGain.connect(this.bus!);

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

    return { gain: bedGain, target: 0, idleTimer: null, idle: false, lastUsed: 0, stop };
  }
}

export const audioEngine = new AudioEngine();
