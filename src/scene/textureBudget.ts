import { useTexture } from "@react-three/drei";
import type { Texture } from "three";

/**
 * Texture-budget pass (§6 / §12). drei's `useTexture` keeps every loaded image in
 * the r3f loader cache, so painting/artifact textures stay resident on the GPU
 * even after their room unmounts — across a long visit that grows unbounded. We
 * track each loaded art texture by URL and, when the visitor changes floors,
 * dispose the ones that don't belong to the current floor. Live texture memory is
 * thus bounded to a single floor at a time.
 *
 * This is safe because floors only connect through the art-less atria (the
 * staircase links atrium↔atrium, §2.6): at the moment `floorLevel` changes, no
 * themed room — and so no art mesh — from the floor we're leaving is still mounted.
 */
const tracked = new Map<string, Texture>();

/** Called by {@link ArtImage} once its texture has loaded. */
export function trackTexture(url: string, texture: Texture): void {
  tracked.set(url, texture);
}

/**
 * Dispose every tracked texture whose URL isn't in `keep`, and evict it from the
 * loader cache so a later revisit reloads it fresh — a disposed-but-still-cached
 * texture would render black.
 */
export function releaseTexturesExcept(keep: Set<string>): void {
  for (const url of [...tracked.keys()]) {
    if (keep.has(url)) continue;
    tracked.get(url)?.dispose();
    tracked.delete(url);
    try {
      // Evict from drei's loader cache (same key drei loads under) so a later
      // revisit reloads fresh — a disposed-but-cached texture renders black.
      useTexture.clear(url);
    } catch {
      /* entry may not be in the loader cache — ignore */
    }
  }
}
