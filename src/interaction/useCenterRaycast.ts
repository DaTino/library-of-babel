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
 * start a stair climb (§2.6). The first solid surface stops the ray, so nothing
 * can be picked through a wall (hallways put exhibits just the other side of
 * one); decorative overlays opt out of raycasting entirely. Paused while
 * unlocked, mid-move, or while an overlay is open.
 */
export function useCenterRaycast() {
  const scene = useThree((s) => s.scene);
  const camera = useThree((s) => s.camera);
  const setHovered = useMuseumStore((s) => s.setHovered);
  const openArt = useMuseumStore((s) => s.openArt);
  const openReader = useMuseumStore((s) => s.openReader);
  const startClimb = useMuseumStore((s) => s.startClimb);

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
    const { isLocked, overlay, isTraveling, climb } = useMuseumStore.getState();
    if (!isLocked || overlay !== "none" || isTraveling || climb) {
      clearHover();
      return;
    }

    ray.setFromCamera(center, camera);
    ray.far = MAX_INTERACT_DISTANCE;
    const hits = ray.intersectObjects(scene.children, true);

    // Only the nearest surface counts: an interactable, or a wall that blocks.
    const found: Hit | null = hits.length > 0 ? findInteractable(hits[0].object) : null;

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
      } else if (h.kind === "stairs" && h.targetRoomId && h.climbDir) {
        startClimb(h.targetRoomId, h.climbDir); // stays pointer-locked for the climb
      } else if (h.kind === "exit") {
        // Doorways are walked through now (§2.7) — hovering just names the way.
      } else if (h.artwork) {
        openArt(h.artwork);
        document.exitPointerLock();
      }
    };
    window.addEventListener("pointerdown", onPointerDown);
    return () => window.removeEventListener("pointerdown", onPointerDown);
  }, [openArt, openReader, startClimb]);
}
