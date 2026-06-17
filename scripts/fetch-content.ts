/**
 * Build-time content fetcher (§8). Pulls open-licensed art (The Met) and full
 * texts (Project Gutenberg via Gutendex), normalizes them to the §4 schema,
 * caches images + text locally (CORS-safe, same-origin), and writes a manifest
 * the app loads at runtime. Run: `npm run fetch:content`.
 *
 * Books are one global pool (§8.5), fetched across genres (fiction, non-fiction,
 * poetry, drama, essays) and dealt out uniquely at runtime — so it sources
 * enough texts to fill every shelf with no repeats (36 shelves × 10 = 360).
 *
 * Output (git-ignored): public/content/{manifest.json, images/*.jpg, texts/*.txt}
 */
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";

const OUT = "public/content";
const IMG_DIR = join(OUT, "images");
const TXT_DIR = join(OUT, "texts");
const MET = "https://collectionapi.metmuseum.org/public/collection/v1";
const GUTENDEX = "https://gutendex.com";

const ART_PER_CULTURE = 8;
const MAX_ART_ATTEMPTS = 45;
const BOOK_TARGET = 360; // 36 shelves × 10, dealt out uniquely at runtime

// Manual override hook (§9): Met object IDs to exclude (bad pick / off-theme / low-res).
const BLOCKLIST = new Set<number>([]);

type CultureId =
  | "egypt"
  | "mesoamerica"
  | "greece"
  | "china"
  | "renaissance_italy"
  | "tudor_england"
  | "mesopotamia"
  | "pacific_northwest"
  | "rome"
  | "mali_songhai"
  | "napoleonic_france"
  | "edo_japan";

// Met department (optional) + search terms per culture (§9). Quality is gated on
// isPublicDomain + a usable image, so off-theme hits are dropped. Thin cultures
// (no reliable single department) search the whole collection.
const CULTURE_QUERIES: Record<CultureId, { departmentId?: number; queries: string[] }> = {
  egypt: { departmentId: 10, queries: ["Egyptian"] },
  mesoamerica: { departmentId: 5, queries: ["Maya", "Aztec", "Olmec"] },
  greece: { departmentId: 13, queries: ["Greek"] },
  china: { departmentId: 6, queries: ["China"] },
  renaissance_italy: { departmentId: 11, queries: ["Italian"] },
  tudor_england: { departmentId: 11, queries: ["Tudor", "Elizabethan", "British portrait"] },
  mesopotamia: { departmentId: 3, queries: ["Sumerian", "Assyrian", "Babylonian", "Achaemenid"] },
  pacific_northwest: { queries: ["Tlingit", "Haida", "Kwakiutl", "Northwest Coast"] },
  rome: { departmentId: 13, queries: ["Roman"] },
  mali_songhai: { queries: ["Mali", "Djenné", "Dogon", "Bamana"] },
  napoleonic_france: { departmentId: 11, queries: ["Napoleon", "Empire", "Jacques-Louis David"] },
  edo_japan: { departmentId: 6, queries: ["Edo", "ukiyo-e", "Japan"] },
};

const CULTURES = Object.keys(CULTURE_QUERIES) as CultureId[];

// Global book pool by genre (§8.5). Order matters: the genre buckets are filled
// first; popular fiction soaks up the remainder to BOOK_TARGET.
const BOOK_BUCKETS: { topic?: string; label: string; count: number }[] = [
  { topic: "poetry", label: "poetry", count: 60 },
  { topic: "drama", label: "drama", count: 55 },
  { topic: "essays", label: "essays", count: 40 },
  { topic: "history", label: "history", count: 55 },
  { topic: "science", label: "science", count: 30 },
  { topic: "philosophy", label: "philosophy", count: 30 },
  { label: "fiction", count: 120 },
];

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// Retry with backoff — the Met API throttles (403/429) under sustained load.
async function getJSON(url: string, tries = 4): Promise<any> {
  for (let i = 0; i < tries; i++) {
    try {
      const res = await fetch(url);
      if (res.status === 403 || res.status === 429 || res.status >= 500) {
        await sleep(1500 * (i + 1));
        continue;
      }
      if (!res.ok) throw new Error(`${res.status} ${url}`);
      return await res.json();
    } catch (e) {
      if (i === tries - 1) throw e;
      await sleep(1500 * (i + 1));
    }
  }
  throw new Error(`exhausted retries: ${url}`);
}

async function download(url: string, dest: string, tries = 3): Promise<void> {
  for (let i = 0; i < tries; i++) {
    const res = await fetch(url);
    if (res.ok) {
      await writeFile(dest, Buffer.from(await res.arrayBuffer()));
      return;
    }
    if (i === tries - 1) throw new Error(`${res.status} ${url}`);
    await sleep(1000 * (i + 1));
  }
}

function shuffle<T>(arr: T[]): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

async function fetchArt(culture: CultureId) {
  const cfg = CULTURE_QUERIES[culture];
  const dept = cfg.departmentId !== undefined ? `departmentId=${cfg.departmentId}&` : "";
  const ids: number[] = [];
  for (const q of cfg.queries) {
    try {
      const data = await getJSON(`${MET}/search?${dept}hasImages=true&q=${encodeURIComponent(q)}`);
      if (Array.isArray(data.objectIDs)) ids.push(...data.objectIDs.slice(0, 200));
    } catch (e) {
      console.warn(`  search failed ${culture}/${q}: ${(e as Error).message}`);
    }
  }

  const candidates = shuffle([...new Set(ids)]);
  const out: unknown[] = [];
  let attempts = 0;
  for (const id of candidates) {
    if (out.length >= ART_PER_CULTURE || attempts >= MAX_ART_ATTEMPTS) break;
    if (BLOCKLIST.has(id)) continue;
    attempts++;
    try {
      const o = await getJSON(`${MET}/objects/${id}`);
      await sleep(55);
      if (!o.isPublicDomain || !o.primaryImageSmall) continue;
      const file = `met-${id}.jpg`;
      await download(o.primaryImageSmall, join(IMG_DIR, file));
      out.push({
        id: `met-${id}`,
        title: o.title || "Untitled",
        creator: o.artistDisplayName || o.culture || undefined,
        date: o.objectDate || undefined,
        culture,
        imageUrl: `/content/images/${file}`,
        thumbUrl: `/content/images/${file}`,
        source: {
          provider: "The Metropolitan Museum of Art",
          providerUrl: o.objectURL || `https://www.metmuseum.org/art/collection/search/${id}`,
          license: "CC0",
          attributionText: o.creditLine || undefined,
        },
      });
      console.log(`  ✓ ${culture}: ${String(o.title).slice(0, 52)}`);
    } catch {
      /* skip and continue */
    }
  }
  if (out.length < ART_PER_CULTURE) {
    console.warn(`  ⚠ ${culture}: only ${out.length}/${ART_PER_CULTURE} (thin — placeholders fill the gaps)`);
  }
  return out;
}

function stripGutenberg(text: string): string {
  let body = text;
  const start = body.indexOf("*** START OF");
  if (start !== -1) {
    const nl = body.indexOf("\n", start);
    if (nl !== -1) body = body.slice(nl + 1);
  }
  const end = body.indexOf("*** END OF");
  if (end !== -1) body = body.slice(0, end);
  return body.trim();
}

async function fetchBooks() {
  const out: unknown[] = [];
  const seen = new Set<number>();

  for (const bucket of BOOK_BUCKETS) {
    if (out.length >= BOOK_TARGET) break;
    let collected = 0;
    const topic = bucket.topic ? `&topic=${encodeURIComponent(bucket.topic)}` : "";
    for (let page = 1; collected < bucket.count && out.length < BOOK_TARGET && page <= 14; page++) {
      let data: any;
      try {
        data = await getJSON(`${GUTENDEX}/books?languages=en&copyright=false${topic}&page=${page}`);
      } catch {
        break;
      }
      for (const b of data.results ?? []) {
        if (collected >= bucket.count || out.length >= BOOK_TARGET) break;
        if (seen.has(b.id)) continue;
        const key = Object.keys(b.formats).find(
          (k) => k.startsWith("text/plain") && !b.formats[k].endsWith(".zip"),
        );
        if (!key) continue;
        try {
          const res = await fetch(b.formats[key]);
          if (!res.ok) continue;
          const body = stripGutenberg(await res.text());
          if (body.length < 2000) continue;
          seen.add(b.id);
          const file = `pg-${b.id}.txt`;
          await writeFile(join(TXT_DIR, file), body);
          out.push({
            id: `pg-${b.id}`,
            title: b.title,
            author: b.authors?.[0]?.name,
            language: "en",
            readUrl: `/content/texts/${file}`,
            externalUrl: `https://www.gutenberg.org/ebooks/${b.id}`,
            source: {
              provider: "Project Gutenberg",
              providerUrl: `https://www.gutenberg.org/ebooks/${b.id}`,
              license: "PD",
            },
          });
          collected++;
          await sleep(15);
        } catch {
          /* skip */
        }
      }
    }
    console.log(`  ✓ ${bucket.label}: ${collected} (total ${out.length}/${BOOK_TARGET})`);
  }
  return out;
}

async function main() {
  // Art-only merge mode: refresh art for specific cultures without touching the
  // cached texts or other cultures, e.g. `ART_ONLY=rome,edo_japan npm run fetch:content`.
  const artOnly = process.env.ART_ONLY?.split(",")
    .map((s) => s.trim())
    .filter(Boolean) as CultureId[] | undefined;
  if (artOnly?.length) {
    await mkdir(IMG_DIR, { recursive: true });
    const manifest = JSON.parse(await readFile(join(OUT, "manifest.json"), "utf8"));
    for (const culture of artOnly) {
      console.log(`Re-fetching art — ${culture}`);
      manifest.artByCulture[culture] = await fetchArt(culture);
    }
    await writeFile(join(OUT, "manifest.json"), JSON.stringify(manifest, null, 2));
    const n = artOnly.reduce((s, c) => s + (manifest.artByCulture[c]?.length ?? 0), 0);
    console.log(`\nMerged art for ${artOnly.join(", ")} — ${n} artworks.`);
    return;
  }

  await rm(OUT, { recursive: true, force: true });
  await mkdir(IMG_DIR, { recursive: true });
  await mkdir(TXT_DIR, { recursive: true });

  const artByCulture: Record<string, unknown[]> = {};
  for (const culture of CULTURES) {
    console.log(`Fetching art — ${culture}`);
    artByCulture[culture] = await fetchArt(culture);
  }

  console.log("Fetching books (global pool by genre, §8.5)…");
  const books = await fetchBooks();

  const manifest = { generatedAt: new Date().toISOString(), artByCulture, books };
  await writeFile(join(OUT, "manifest.json"), JSON.stringify(manifest, null, 2));

  const artCount = Object.values(artByCulture).reduce((n, a) => n + a.length, 0);
  console.log(`\nDone — ${artCount} artworks, ${books.length} books → ${OUT}/manifest.json`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
