import type { ContentProvider } from "../model/deriveMuseum";
import { createCachedProvider } from "./provider";
import type { CachedManifest, MusicManifest } from "./types";

/** The downloaded soundtrack (`public/content/music.json`, §8.7), if fetched. */
export async function loadSoundtrack(): Promise<MusicManifest | null> {
  try {
    const res = await fetch(`${import.meta.env.BASE_URL}content/music.json`, {
      cache: "no-cache",
    });
    if (!res.ok) return null;
    const m = (await res.json()) as MusicManifest;
    return m && Array.isArray(m.house) ? m : null;
  } catch {
    return null;
  }
}

/**
 * Try to load the build-time cache (§8). Returns a cached content provider when
 * `public/content/manifest.json` is present (after `npm run fetch:content`),
 * otherwise null so the app keeps the placeholder content.
 */
export async function loadCachedContent(): Promise<ContentProvider | null> {
  try {
    const res = await fetch(`${import.meta.env.BASE_URL}content/manifest.json`, {
      cache: "no-cache",
    });
    if (!res.ok) return null;
    const manifest = (await res.json()) as CachedManifest;
    const hasArt = Object.values(manifest.artByCulture ?? {}).some((a) => a && a.length > 0);
    if (!hasArt && !(manifest.books?.length > 0)) return null;
    return createCachedProvider(manifest);
  } catch {
    return null;
  }
}
