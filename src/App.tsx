import { useEffect } from "react";
import { Canvas } from "@react-three/fiber";
import { ActiveControls } from "./controls";
import { Scene } from "./scene/Scene";
import { Hud } from "./ui/Hud";
import { Overlays } from "./ui/Overlays";
import { Transition } from "./ui/Transition";
import { museum } from "./data/placeholder";
import { roomsById } from "./model/deriveMuseum";
import { EYE_HEIGHT } from "./geometry/hexagon";
import { useMuseumStore } from "./state/store";

const ROOMS = roomsById(museum);

export default function App() {
  const currentRoomId = useMuseumStore((s) => s.currentRoomId);
  const setLocked = useMuseumStore((s) => s.setLocked);

  const room = ROOMS.get(currentRoomId) ?? ROOMS.get("floor-1:atrium")!;
  const floorTitle =
    museum.floors.find((f) => f.level === room.floorLevel)?.title ?? `Floor ${room.floorLevel}`;

  useEffect(() => {
    const onChange = () => setLocked(Boolean(document.pointerLockElement));
    document.addEventListener("pointerlockchange", onChange);
    return () => document.removeEventListener("pointerlockchange", onChange);
  }, [setLocked]);

  return (
    <div className="app">
      <Canvas camera={{ position: [0, EYE_HEIGHT, 2.2], fov: 70, near: 0.1, far: 100 }}>
        <color attach="background" args={["#07070a"]} />
        <fog attach="fog" args={["#07070a", 10, 30]} />
        {/* Keyed by room id so each scene fully mounts/disposes on travel (§2.4). */}
        <Scene key={room.id} room={room} rooms={ROOMS} />
        <ActiveControls />
      </Canvas>
      <Hud room={room} floorTitle={floorTitle} />
      <Overlays room={room} />
      <Transition />
    </div>
  );
}
