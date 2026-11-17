import { CURATION_VERSION, type CurationManifest } from "./curation";

/**
 * Load the owner's curation (§8.6) from `public/curation/curation.json`.
 * Returns null when there's none (or it's unreadable), so the museum simply uses
 * its downloaded content.
 */
export async function loadCuration(): Promise<CurationManifest | null> {
  try {
    const res = await fetch(`${import.meta.env.BASE_URL}curation/curation.json`, {
      cache: "no-cache",
    });
    if (!res.ok) return null;
    const c = (await res.json()) as CurationManifest;
    if (!c || typeof c !== "object" || c.version !== CURATION_VERSION) return null;
    return { version: c.version, rooms: c.rooms ?? {}, hallways: c.hallways ?? {} };
  } catch {
    return null;
  }
}

/** Dev only: call `onChange` whenever the admin saves (pushed by the dev server). */
export function onCurationChange(onChange: () => void): () => void {
  const hot = import.meta.hot;
  if (!hot) return () => {};
  hot.on("curation:update", onChange);
  return () => hot.off?.("curation:update", onChange);
}
