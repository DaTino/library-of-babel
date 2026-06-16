import { useEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { Raycaster, Vector2, type Object3D } from "three";
import { useMuseumStore } from "../state/store";
import type { InteractableData } from "./types";

const MAX_INTERACT_DISTANCE = 6;
const HIGHLIGHT_SCALE = 1.04;

type Hit = InteractableData & { object: Object3D };

/** Walk up the parent chain to find the nearest interactable ancestor. */
function findInteractable(obj: Object3D | null): Hit | null {
  for (let cur = obj; cur; cur = cur.parent) {
    const data = cur.userData as Partial<InteractableData>;
    if (data.interactable) return { ...(cur.userData as InteractableData), object: cur };
  }
  return null;
}

/**
 * Under pointer lock the cursor is centered, so we raycast from screen-center
 * each frame (§6.5): hover → highlight + label, click → open an overlay (§7) or
 * travel through an exit (§2.4). Paused while unlocked, mid-transition, or while
 * an overlay is open.
 */
export function useCenterRaycast() {
  const scene = useThree((s) => s.scene);
  const camera = useThree((s) => s.camera);
  const setHovered = useMuseumStore((s) => s.setHovered);
  const openArt = useMuseumStore((s) => s.openArt);
  const openReader = useMuseumStore((s) => s.openReader);
  const requestTravel = useMuseumStore((s) => s.requestTravel);

  const ray = useMemo(() => new Raycaster(), []);
  const center = useMemo(() => new Vector2(0, 0), []);
  const hoveredRef = useRef<Hit | null>(null);
  const highlightedRef = useRef<Object3D | null>(null);

  const clearHover = () => {
    if (highlightedRef.current) highlightedRef.current.scale.setScalar(1);
    highlightedRef.current = null;
    if (hoveredRef.current) {
      hoveredRef.current = null;
      setHovered(null);
    }
  };

  useFrame(() => {
    const { isLocked, overlay, isTraveling } = useMuseumStore.getState();
    if (!isLocked || overlay !== "none" || isTraveling) {
      clearHover();
      return;
    }

    ray.setFromCamera(center, camera);
    const hits = ray.intersectObjects(scene.children, true);

    let found: Hit | null = null;
    for (const hit of hits) {
      if (hit.distance > MAX_INTERACT_DISTANCE) break;
      const it = findInteractable(hit.object);
      if (it) {
        found = it;
        break;
      }
    }

    if ((hoveredRef.current?.id ?? null) === (found?.id ?? null)) return;

    if (highlightedRef.current) highlightedRef.current.scale.setScalar(1);
    highlightedRef.current = null;
    hoveredRef.current = found;
    if (found) {
      found.object.scale.setScalar(HIGHLIGHT_SCALE);
      highlightedRef.current = found.object;
    }
    setHovered(found ? { id: found.id, label: found.label, kind: found.kind } : null);
  });

  useEffect(() => {
    const onPointerDown = () => {
      if (!document.pointerLockElement) return;
      const h = hoveredRef.current;
      if (!h) return;
      if (h.kind === "book" && h.book) {
        openReader(h.book);
        document.exitPointerLock();
      } else if (h.kind === "exit" && h.targetRoomId) {
        requestTravel(h.targetRoomId); // stays pointer-locked through the fade
      } else if (h.artwork) {
        openArt(h.artwork);
        document.exitPointerLock();
      }
    };
    window.addEventListener("pointerdown", onPointerDown);
    return () => window.removeEventListener("pointerdown", onPointerDown);
  }, [openArt, openReader, requestTravel]);
}
