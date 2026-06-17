import { useEffect, useRef } from "react";
import type { Room } from "../model/types";
import { useMuseumStore } from "../state/store";
import { audioEngine } from "./AudioEngine";
import { profileForRoom } from "./profiles";

/**
 * Wires the ambient audio engine to the active room and mute state (§6.6).
 * Audio starts on the first user gesture (autoplay policy) and crossfades to
 * each room's bed on travel.
 */
export function useAudio(room: Room) {
  const muted = useMuseumStore((s) => s.muted);
  const profile = profileForRoom(room.kind, room.culture);
  const profileRef = useRef(profile);
  profileRef.current = profile;

  useEffect(() => {
    const onGesture = () => {
      if (audioEngine.isStarted()) return;
      audioEngine.start();
      audioEngine.setMuted(useMuseumStore.getState().muted);
      audioEngine.setRoom(profileRef.current);
      useMuseumStore.getState().enableAudio();
    };
    window.addEventListener("pointerdown", onGesture);
    window.addEventListener("keydown", onGesture);
    return () => {
      window.removeEventListener("pointerdown", onGesture);
      window.removeEventListener("keydown", onGesture);
    };
  }, []);

  useEffect(() => {
    if (audioEngine.isStarted()) audioEngine.setRoom(profile);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [room.id]);

  useEffect(() => {
    if (audioEngine.isStarted()) audioEngine.setMuted(muted);
  }, [muted]);
}
