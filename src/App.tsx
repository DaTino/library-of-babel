import { useEffect } from "react";
import { Canvas } from "@react-three/fiber";
import { ActiveControls } from "./controls";
import { Room } from "./scene/Room";
import { Interaction } from "./scene/Interaction";
import { Hud } from "./ui/Hud";
import { museum } from "./data/placeholder";
import { roomsById } from "./model/deriveMuseum";
import { EYE_HEIGHT } from "./geometry/hexagon";
import { useMuseumStore } from "./state/store";

const ROOMS = roomsById(museum);
const DEMO_ROOM_ID = "floor-1:egypt"; // Phase 1 renders a single room; the graph is Phase 3.

export default function App() {
  const room = ROOMS.get(DEMO_ROOM_ID)!;
  const setLocked = useMuseumStore((s) => s.setLocked);

  useEffect(() => {
    const onChange = () => setLocked(Boolean(document.pointerLockElement));
    document.addEventListener("pointerlockchange", onChange);
    return () => document.removeEventListener("pointerlockchange", onChange);
  }, [setLocked]);

  return (
    <div className="app">
      <Canvas camera={{ position: [0, EYE_HEIGHT, 2.6], fov: 70, near: 0.1, far: 100 }}>
        <color attach="background" args={["#07070a"]} />
        <fog attach="fog" args={["#07070a", 9, 28]} />
        <Room room={room} />
        <ActiveControls />
        <Interaction />
      </Canvas>
      <Hud room={room} />
    </div>
  );
}
