import { useEffect, useMemo, useState } from "react";
import { Canvas } from "@react-three/fiber";
import { ActiveControls } from "./controls";
import { Scene } from "./scene/Scene";
import { Hud } from "./ui/Hud";
import { Overlays } from "./ui/Overlays";
import { Transition } from "./ui/Transition";
import { useAudio } from "./audio/useAudio";
import { placeholderContent } from "./data/placeholder";
import { deriveMuseum, roomsById } from "./model/deriveMuseum";
import { FLOORS } from "./config/layout";
import { loadCachedContent } from "./content/load";
import { EYE_HEIGHT } from "./geometry/hexagon";
import type { Museum } from "./model/types";
import { useMuseumStore } from "./state/store";

export default function App() {
  const currentRoomId = useMuseumStore((s) => s.currentRoomId);
  const setLocked = useMuseumStore((s) => s.setLocked);

  // Start with placeholder content; swap in the build-time cache when present (§8).
  const [museum, setMuseum] = useState<Museum>(() => deriveMuseum(FLOORS, placeholderContent));
  const rooms = useMemo(() => roomsById(museum), [museum]);
  const room = rooms.get(currentRoomId) ?? rooms.get("floor-1:atrium")!;
  const floorTitle =
    museum.floors.find((f) => f.level === room.floorLevel)?.title ?? `Floor ${room.floorLevel}`;

  useAudio(room);

  useEffect(() => {
    let cancelled = false;
    loadCachedContent().then((provider) => {
      if (provider && !cancelled) setMuseum(deriveMuseum(FLOORS, provider));
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const onChange = () => setLocked(Boolean(document.pointerLockElement));
    document.addEventListener("pointerlockchange", onChange);
    return () => document.removeEventListener("pointerlockchange", onChange);
  }, [setLocked]);

  return (
    <div className="app">
      <Canvas
        dpr={[1, 2]}
        camera={{ position: [0, EYE_HEIGHT, 2.2], fov: 70, near: 0.1, far: 100 }}
      >
        <color attach="background" args={["#07070a"]} />
        <fog attach="fog" args={["#07070a", 10, 30]} />
        {/* Keyed by room id so each scene fully mounts/disposes on travel (§2.4). */}
        <Scene key={room.id} room={room} rooms={rooms} />
        <ActiveControls />
      </Canvas>
      <Hud room={room} floorTitle={floorTitle} />
      <Overlays room={room} />
      <Transition />
    </div>
  );
}
