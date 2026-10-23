/**
 * Shared helpers for the build-time fetchers (§8): polite HTTP with retries,
 * file downloads, and Wikimedia Commons license/attribution normalization.
 */
import { writeFile } from "node:fs/promises";

export const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// Retry with backoff — the Met API throttles (403/429) under sustained load.
export async function getJSON(
  url: string,
  tries = 4,
  headers?: Record<string, string>,
  backoffMs = 1500,
): Promise<any> {
  for (let i = 0; i < tries; i++) {
    try {
      const res = await fetch(url, headers ? { headers } : undefined);
      if (res.status === 403 || res.status === 429 || res.status >= 500) {
        await sleep(backoffMs * (i + 1));
        continue;
      }
      if (!res.ok) throw new Error(`${res.status} ${url}`);
      return await res.json();
    } catch (e) {
      if (i === tries - 1) throw e;
      await sleep(backoffMs * (i + 1));
    }
  }
  throw new Error(`exhausted retries: ${url}`);
}

export async function download(
  url: string,
  dest: string,
  tries = 3,
  headers?: Record<string, string>,
  backoffMs = 1000,
): Promise<void> {
  for (let i = 0; i < tries; i++) {
    const res = await fetch(url, headers ? { headers } : undefined);
    if (res.ok) {
      await writeFile(dest, Buffer.from(await res.arrayBuffer()));
      return;
    }
    // 4xx other than rate limiting won't get better by retrying.
    if (i === tries - 1 || (res.status >= 400 && res.status < 500 && res.status !== 429)) {
      throw new Error(`${res.status} ${url}`);
    }
    await sleep(backoffMs * (i + 1) * (res.status === 429 ? 4 : 1));
  }
}

// Wikimedia only renders thumbnails at standard widths (e.g. 250, 330, 500, 960,
// 1280, 1920 — others answer 400), and rate-limits bursts of file downloads
// (429) — so use those widths and space downloads out.
const COMMONS_DOWNLOAD_GAP_MS = 1000;
let lastCommonsDownload = 0;

/**
 * A Commons file at a standard thumbnail width. `thumbUrl` is any thumbnail URL
 * the API returned (…/thumb/…/NNNpx-Name); `originalUrl` + `originalWidth`
 * cover files the API returned unscaled (already narrower than requested).
 */
export function commonsThumb(
  originalUrl: string,
  originalWidth: number,
  thumbUrl: string | undefined,
  px: number,
): string {
  // The API decorates URLs with ?utm_… tracking parameters — drop them before
  // building paths, or they end up inside the requested file name.
  const original = originalUrl.split("?")[0];
  const thumb = thumbUrl?.split("?")[0];
  // Originals are rate-limited much harder than (cached) standard thumbnails, so
  // step down to the largest standard width the file actually has.
  if (originalWidth < px) px = [1280, 960, 500, 330, 250].find((w) => w <= originalWidth) ?? 0;
  if (!px) return original;
  if (thumb && /\/\d+px-/.test(thumb)) return thumb.replace(/\/\d+px-/, `/${px}px-`);
  // Build the thumb path from the original: …/commons/a/ab/Name → …/commons/thumb/a/ab/Name/NNNpx-Name
  const m = original.match(/^(.*\/commons\/)([0-9a-f]\/[0-9a-f]{2}\/)([^/]+)$/);
  return m ? `${m[1]}thumb/${m[2]}${m[3]}/${px}px-${m[3]}` : original;
}

/** Download a Commons file, spaced from the previous one, backing off on 429. */
export async function commonsDownload(url: string, dest: string): Promise<void> {
  const wait = lastCommonsDownload + COMMONS_DOWNLOAD_GAP_MS - Date.now();
  if (wait > 0) await sleep(wait);
  lastCommonsDownload = Date.now();
  await download(url, dest, 4, { "User-Agent": COMMONS_UA }, 2500);
}

export function shuffle<T>(arr: T[]): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export function stripHtml(s?: string): string | undefined {
  if (!s) return undefined;
  return (
    s
      .replace(/<[^>]*>/g, "")
      .replace(/\s+/g, " ")
      .trim() || undefined
  );
}

// --- Wikimedia Commons (§8.2) ----------------------------------------------
// Educational/personal use → CC0/PD/CC-BY/CC-BY-SA are all in scope (§8.4,
// Q10). Wikimedia asks clients to send a descriptive User-Agent, and throttles
// bursts of API calls, so calls are spaced out and retried with long backoff.
export const COMMONS = "https://commons.wikimedia.org/w/api.php";
export const COMMONS_UA = "LibraryOfBabel-VirtualMuseum/1.0 (educational project; fetch-content)";
export const COMMONS_OK = /cc0|public domain|cc[ -]by(?:[ -]sa)?|pd-/i;

const COMMONS_GAP_MS = 1100;
let lastCommonsCall = 0;

/** A Commons API GET, spaced ≥1.1 s from the previous one, with backoff. */
export async function commonsJSON(params: URLSearchParams): Promise<any> {
  const wait = lastCommonsCall + COMMONS_GAP_MS - Date.now();
  if (wait > 0) await sleep(wait);
  lastCommonsCall = Date.now();
  return getJSON(`${COMMONS}?${params}`, 5, { "User-Agent": COMMONS_UA }, 5000);
}

export function normalizeLicense(short: string): string {
  const s = short.toLowerCase();
  if (s.includes("cc0")) return "CC0";
  if (s.includes("public domain") || s === "pd" || s.startsWith("pd-")) return "PD";
  if (s.includes("by-sa")) return "CC-BY-SA";
  if (s.includes("by")) return "CC-BY";
  return "other";
}

// A guaranteed, meaningful credit line (CC-BY/CC-BY-SA legally require attribution,
// §8.4). Prefer a named Artist/Credit; for self-uploads ("Own work") the uploader
// IS the author, so name them; never return empty.
export function commonsAttribution(artist?: string, credit?: string, uploader?: string): string {
  const generic = (s?: string) => !!s && /^(own work|self|self-photographed|unknown)/i.test(s);
  if (artist && !generic(artist)) return artist;
  if (uploader) return `${uploader} (via Wikimedia Commons)`;
  if (artist) return artist; // generic, but better than nothing
  if (credit && !generic(credit)) return credit;
  return "Wikimedia Commons";
}
