import type { CurationCredit, CurationManifest } from "../content/curation";
import { CURATION_VERSION, emptyCuration } from "../content/curation";
import type { CachedManifest, MusicManifest } from "../content/types";

/** Talks to the dev-server curation API (scripts/curation-admin.mjs). */

const API = "/__curation/api/";

export class ApiError extends Error {
  details: string[];
  constructor(message: string, details: string[] = []) {
    super(message);
    this.details = details;
  }
}

async function call<T>(method: string, route: string, body?: unknown): Promise<T> {
  let res: Response;
  try {
    res = await fetch(API + route, {
      method,
      headers: body ? { "Content-Type": "application/json" } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new ApiError("Couldn't reach the dev server — is `npm run admin` still running?");
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new ApiError(
      data.error ?? (res.status === 404 ? "The admin API isn't available." : `Error ${res.status}`),
      data.details ?? [],
    );
  }
  return data as T;
}

/** True when the page is served by the dev server with the admin API. */
export const ping = () =>
  call<{ ok: boolean }>("GET", "ping").then(
    (r) => r.ok,
    () => false,
  );

export type Target = { kind: "room" | "hallway"; id: string; slot: string };

export const pinImage = (t: Target, credit: CurationCredit, full: string, thumb: string) =>
  call("PUT", "image", { ...t, credit, full, thumb });
export const editImage = (t: Target, credit: CurationCredit) =>
  call("PATCH", "image", { ...t, credit });
export const unpinImage = (t: Target) => call("DELETE", "image", t);

export const setMusic = (id: string, credit: CurationCredit, data: string, volume: number) =>
  call("PUT", "music", { id, credit, data, volume });
export const editMusic = (id: string, patch: { credit?: CurationCredit; volume?: number }) =>
  call("PATCH", "music", { id, ...patch });
export const removeMusic = (id: string) => call("DELETE", "music", { id });

/** The current curation, straight from disk (bypassing caches). */
export async function fetchCuration(): Promise<CurationManifest> {
  try {
    const res = await fetch(`/curation/curation.json?t=${Date.now()}`, { cache: "no-store" });
    if (!res.ok) return emptyCuration();
    const c = (await res.json()) as CurationManifest;
    return c?.version === CURATION_VERSION
      ? { version: c.version, rooms: c.rooms ?? {}, hallways: c.hallways ?? {} }
      : emptyCuration();
  } catch {
    return emptyCuration();
  }
}

/** The downloaded soundtrack (§8.7), to show what each room plays by default. */
export async function fetchSoundtrack(): Promise<MusicManifest | null> {
  try {
    const res = await fetch("/content/music.json", { cache: "no-store" });
    return res.ok ? ((await res.json()) as MusicManifest) : null;
  } catch {
    return null;
  }
}

/** The downloaded content (to show each spot's random pool), if fetched. */
export async function fetchDownloaded(): Promise<CachedManifest | null> {
  try {
    const res = await fetch("/content/manifest.json", { cache: "no-store" });
    return res.ok ? ((await res.json()) as CachedManifest) : null;
  } catch {
    return null;
  }
}
