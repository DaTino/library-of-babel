import { useEffect, useRef } from "react";

export interface MoveState {
  forward: boolean;
  back: boolean;
  left: boolean;
  right: boolean;
}

const KEY_MAP: Record<string, keyof MoveState> = {
  KeyW: "forward",
  ArrowUp: "forward",
  KeyS: "back",
  ArrowDown: "back",
  KeyA: "left",
  ArrowLeft: "left",
  KeyD: "right",
  ArrowRight: "right",
};

/**
 * Minimal WASD/arrow key tracker. Returns a stable ref so the render loop reads
 * input without re-rendering. Deliberately self-contained (no provider) to keep
 * the controller swappable for WebXR later (§5).
 */
export function useKeyboard() {
  const state = useRef<MoveState>({ forward: false, back: false, left: false, right: false });

  useEffect(() => {
    const apply = (code: string, value: boolean) => {
      const key = KEY_MAP[code];
      if (key) state.current[key] = value;
    };
    const down = (e: KeyboardEvent) => apply(e.code, true);
    const up = (e: KeyboardEvent) => apply(e.code, false);
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
    };
  }, []);

  return state;
}
