import { useEffect, useMemo, useState } from "react";
import { Canvas } from "@react-three/fiber";
import { ActiveControls } from "./controls";
import { Scene } from "./scene/Scene";
import { Hud } from "./ui/Hud";
import { Overlays } from "./ui/Overlays";
import { Transition } from "./ui/Transition";
import { useAudio } from "./audio/useAudio";
import { placeholderContent } from "./data/placeholder";
import { deriveMuseum, hallwaysById, roomsById } from "./model/deriveMuseum";
import { floorArtUrls } from "./model/assets";
import { releaseTexturesExcept } from "./scene/textureBudget";
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
  const hallways = useMemo(() => hallwaysById(museum), [museum]);
  const topLevel = useMemo(() => Math.max(...museum.floors.map((f) => f.level)), [museum]);
  const floorTitles = useMemo(
    () => new Map(museum.floors.map((f) => [f.level, f.title ?? `Floor ${f.level + 1}`])),
    [museum],
  );
  const room = rooms.get(currentRoomId) ?? rooms.get("floor-1:atrium")!;
  const floorTitle = floorTitles.get(room.floorLevel) ?? `Floor ${room.floorLevel}`;

  useAudio(room, rooms);

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

  // Texture-budget pass (§12): when the visitor changes floors (or content swaps
  // in), drop every cached texture that isn't on the current floor — its rooms
  // and its hallways. Safe because floors only meet inside the stair tower, and
  // the floor we leave is unmounted in the same commit that changes the level.
  useEffect(() => {
    releaseTexturesExcept(floorArtUrls(museum, room.floorLevel));
  }, [museum, room.floorLevel]);

  return (
    <div className="app">
      <Canvas
        dpr={[1, 2]}
        camera={{ position: [0, EYE_HEIGHT, 4.2], fov: 70, near: 0.1, far: 100 }}
      >
        <color attach="background" args={["#07070a"]} />
        <fog attach="fog" args={["#07070a", 10, 30]} />
        {/* Rooms swap inside the Scene (keyed by room id there); hallways persist
            across the hand-over so the walk is seamless (§2.7). */}
        <Scene
          room={room}
          rooms={rooms}
          hallways={hallways}
          topLevel={topLevel}
          floorTitles={floorTitles}
        />
        <ActiveControls />
      </Canvas>
      <Hud room={room} rooms={rooms} hallways={hallways} floorTitle={floorTitle} />
      <Overlays room={room} hallways={hallways} />
      <Transition />
    </div>
  );
}
