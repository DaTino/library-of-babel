/**
 * Build-time content fetcher (§8). Pulls open-licensed art (The Met) and full
 * texts (Project Gutenberg via Gutendex), normalizes them to the §4 schema,
 * caches images + text locally (CORS-safe, same-origin), and writes a manifest
 * the app loads at runtime. Run: `npm run fetch:content`.
 *
 * Output (git-ignored): public/content/{manifest.json, images/*.jpg, texts/*.txt}
 */
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";

const OUT = "public/content";
const IMG_DIR = join(OUT, "images");
const TXT_DIR = join(OUT, "texts");
const MET = "https://collectionapi.metmuseum.org/public/collection/v1";
const GUTENDEX = "https://gutendex.com";

const ART_PER_CULTURE = 8;
const MAX_ART_ATTEMPTS = 40;
const BOOK_COUNT = 24;

// Manual override hook (§9): Met object IDs to exclude (bad pick / off-theme / low-res).
const BLOCKLIST = new Set<number>([]);

type CultureId =
  | "egypt"
  | "mesoamerica"
  | "greece"
  | "china"
  | "renaissance_italy"
  | "tudor_england";

// Met department + search terms per culture (§9). Quality is gated below on
// isPublicDomain + a usable image, so off-theme search hits are dropped.
const CULTURE_QUERIES: Record<CultureId, { departmentId: number; queries: string[] }> = {
  egypt: { departmentId: 10, queries: ["Egyptian"] },
  mesoamerica: { departmentId: 5, queries: ["Maya", "Aztec", "Olmec"] },
  greece: { departmentId: 13, queries: ["Greek"] },
  china: { departmentId: 6, queries: ["China"] },
  renaissance_italy: { departmentId: 11, queries: ["Italian"] },
  tudor_england: { departmentId: 11, queries: ["Tudor", "Elizabethan", "British portrait"] },
};

const CULTURES = Object.keys(CULTURE_QUERIES) as CultureId[];

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function getJSON(url: string): Promise<any> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${res.status} ${url}`);
  return res.json();
}

async function download(url: string, dest: string): Promise<void> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${res.status} ${url}`);
  await writeFile(dest, Buffer.from(await res.arrayBuffer()));
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
  const ids: number[] = [];
  for (const q of cfg.queries) {
    try {
      const data = await getJSON(
        `${MET}/search?departmentId=${cfg.departmentId}&hasImages=true&q=${encodeURIComponent(q)}`,
      );
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
      await sleep(60); // be polite to the API
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
      console.log(`  ✓ ${culture}: ${String(o.title).slice(0, 56)}`);
    } catch {
      /* skip and continue */
    }
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
  for (let page = 1; out.length < BOOK_COUNT && page <= 6; page++) {
    let data: any;
    try {
      data = await getJSON(`${GUTENDEX}/books?languages=en&copyright=false&page=${page}`);
    } catch (e) {
      console.warn(`  gutendex page ${page} failed: ${(e as Error).message}`);
      break;
    }
    for (const b of data.results ?? []) {
      if (out.length >= BOOK_COUNT) break;
      const key = Object.keys(b.formats).find(
        (k) => k.startsWith("text/plain") && !b.formats[k].endsWith(".zip"),
      );
      if (!key) continue;
      try {
        const res = await fetch(b.formats[key]);
        if (!res.ok) continue;
        const body = stripGutenberg(await res.text());
        if (body.length < 2000) continue;
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
        console.log(`  ✓ book: ${String(b.title).slice(0, 56)}`);
        await sleep(40);
      } catch {
        /* skip */
      }
    }
  }
  return out;
}

async function main() {
  await mkdir(IMG_DIR, { recursive: true });
  await mkdir(TXT_DIR, { recursive: true });

  const artByCulture: Record<string, unknown[]> = {};
  for (const culture of CULTURES) {
    console.log(`Fetching art — ${culture}`);
    artByCulture[culture] = await fetchArt(culture);
  }

  console.log("Fetching books (global pool, §8.5)…");
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
