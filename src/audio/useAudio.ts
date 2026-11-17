import { useEffect, useMemo, useRef } from "react";
import type { MusicTrack, Room } from "../model/types";
import { useMuseumStore } from "../state/store";
import { audioEngine, type MixEntry } from "./AudioEngine";
import { mixFor } from "./mix";

/**
 * Wires the ambient audio engine to where the visitor is (§6.6). In a room you
 * hear its music (or the house music, or its generated bed); walking a hallway
 * (§2.7) blends from the room behind you, through the house music at the bend,
 * into the room ahead (see mixFor). Audio starts on the first user gesture
 * (autoplay policy). The engine reports what's playing for the HUD.
 */
export function useAudio(room: Room, rooms: Map<string, Room>, house: MusicTrack[] | undefined) {
  const muted = useMuseumStore((s) => s.muted);
  const hallway = useMuseumStore((s) => s.hallway);

  const mix = useMemo<MixEntry[]>(() => {
    const other = hallway ? rooms.get(hallway.otherRoomId) : undefined;
    return mixFor(room, other, hallway?.t ?? null, house);
  }, [room, rooms, hallway, house]);
  const walking = hallway !== null;

  const mixRef = useRef(mix);
  useEffect(() => {
    mixRef.current = mix;
  }, [mix]);

  useEffect(() => {
    const onGesture = () => {
      if (audioEngine.isStarted()) return;
      audioEngine.start();
      audioEngine.setMuted(useMuseumStore.getState().muted);
      audioEngine.setMix(mixRef.current, 0.4);
      useMuseumStore.getState().enableAudio();
    };
    window.addEventListener("pointerdown", onGesture);
    window.addEventListener("keydown", onGesture);
    return () => {
      window.removeEventListener("pointerdown", onGesture);
      window.removeEventListener("keydown", onGesture);
    };
  }, []);

  useEffect(
    () => audioEngine.onNowPlaying((np) => useMuseumStore.getState().setNowPlaying(np)),
    [],
  );

  useEffect(() => {
    // Track footsteps closely in a hallway; crossfade gently after a jump.
    if (audioEngine.isStarted()) audioEngine.setMix(mix, walking ? 0.15 : 0.4);
  }, [mix, walking]);

  useEffect(() => {
    if (audioEngine.isStarted()) audioEngine.setMuted(muted);
  }, [muted]);
}
