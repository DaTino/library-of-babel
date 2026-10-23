import { useEffect, useMemo, useRef } from "react";
import type { Room } from "../model/types";
import { useMuseumStore } from "../state/store";
import { audioEngine, type MixEntry } from "./AudioEngine";
import { profileForRoom } from "./profiles";

const bedKey = (room: Room) => (room.kind === "atrium" ? "atrium" : (room.culture ?? room.id));

const bedFor = (room: Room, weight: number): MixEntry => ({
  key: bedKey(room),
  profile: profileForRoom(room.kind, room.culture),
  weight,
});

/**
 * Wires the ambient audio engine to where the visitor is (§6.6). In a room you
 * hear its bed; walking a hallway (§2.7) blends the two rooms it joins by how
 * far along you are (equal-power, so the loudness stays steady). Audio starts
 * on the first user gesture (autoplay policy).
 */
export function useAudio(room: Room, rooms: Map<string, Room>) {
  const muted = useMuseumStore((s) => s.muted);
  const hallway = useMuseumStore((s) => s.hallway);

  const mix = useMemo<MixEntry[]>(() => {
    const other = hallway ? rooms.get(hallway.otherRoomId) : undefined;
    if (!hallway || !other) return [bedFor(room, 1)];
    const a = (hallway.t * Math.PI) / 2;
    return [bedFor(room, Math.cos(a)), bedFor(other, Math.sin(a))];
  }, [room, rooms, hallway]);
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

  useEffect(() => {
    // Track footsteps closely in a hallway; crossfade gently after a jump.
    if (audioEngine.isStarted()) audioEngine.setMix(mix, walking ? 0.15 : 0.4);
  }, [mix, walking]);

  useEffect(() => {
    if (audioEngine.isStarted()) audioEngine.setMuted(muted);
  }, [muted]);
}
