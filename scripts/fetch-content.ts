/**
 * Build-time content fetcher (§8). Pulls open-licensed art (The Met, topped up
 * from Wikimedia Commons for the cultures the Met is thin on) and full texts
 * (Project Gutenberg via Gutendex), normalizes them to the §4 schema,
 * caches images + text locally (CORS-safe, same-origin), and writes a manifest
 * the app loads at runtime. Run: `npm run fetch:content`.
 *
 * Books are one global pool (§8.5), fetched across genres (fiction, non-fiction,
 * poetry, drama, essays) and dealt out uniquely at runtime — so it sources
 * enough texts to fill every shelf with no repeats (54 shelves × 10 = 540).
 *
 * Hallway exhibits (§9.1) — natural-history plates + specimen photos for 36
 * categories — come from Wikimedia Commons and the Smithsonian (see
 * fetch-exhibits.ts). The Smithsonian needs a free key in SMITHSONIAN_API_KEY,
 * read from the environment or a git-ignored `.env.local`.
 *
 * Output (git-ignored): public/content/{manifest.json, images/, texts/, exhibits/}
 *
 * Partial refreshes (merge into the existing manifest, nothing else touched):
 *   ART_ONLY=rome,edo_japan npm run fetch:content
 *   EXHIBITS_ONLY=1 npm run fetch:content            (all 36 categories)
 *   EXHIBITS_ONLY=coleoptera,odonata npm run fetch:content
 */
import { mkdir, readdir, readFile, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import type { ExhibitCategoryId } from "../src/model/types";
import { EXHIBIT_CATEGORY_IDS } from "../src/data/exhibits";
import {
  COMMONS_OK,
  commonsAttribution,
  commonsDownload,
  commonsJSON,
  commonsThumb,
  download,
  getJSON,
  normalizeLicense,
  shuffle,
  sleep,
  stripHtml,
} from "./fetch-utils";
import { fetchExhibitPool } from "./fetch-exhibits";

// Local secrets (e.g. SMITHSONIAN_API_KEY) live in a git-ignored .env.local.
for (const file of [".env.local", ".env"]) {
  try {
    process.loadEnvFile(file);
  } catch {
    /* not present — fine */
  }
}

const OUT = "public/content";
const IMG_DIR = join(OUT, "images");
const TXT_DIR = join(OUT, "texts");
const EXHIBIT_DIR = join(OUT, "exhibits");
const EXHIBIT_URL = "/content/exhibits";
const MET = "https://collectionapi.metmuseum.org/public/collection/v1";
const GUTENDEX = "https://gutendex.com";

const ART_PER_CULTURE = 12; // deep candidate pool → real per-visit variety (7 of N shown, §9)
const MAX_ART_ATTEMPTS = 60;
const BOOK_TARGET = 540; // 54 shelves × 10 (3 floors), dealt out uniquely at runtime

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
  | "edo_japan"
  | "plains_lakota"
  | "ancient_india"
  | "viking_norse"
  | "islamic_golden_age"
  | "polynesia"
  | "american_19c";

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
  // The Lantern Gallery (top floor)
  // Tribe names (not "Plains"/"Dakota") keep dept-5 from returning Andean objects.
  plains_lakota: { departmentId: 5, queries: ["Lakota", "Sioux", "Cheyenne", "Arapaho"] },
  ancient_india: { departmentId: 6, queries: ["Gandhara", "Maurya", "Mathura", "Indus"] },
  // Medieval dept (17) keeps the Met on-theme; whole-collection "Viking" pulls books/prints.
  viking_norse: { departmentId: 17, queries: ["Viking", "Norse", "Scandinavia"] },
  islamic_golden_age: {
    departmentId: 14,
    queries: ["Abbasid", "Umayyad", "early Islamic", "Samanid"],
  },
  polynesia: { departmentId: 5, queries: ["Polynesia", "Hawaii", "Maori", "Marquesas"] },
  american_19c: {
    departmentId: 1,
    queries: [
      "Hudson River School",
      "American landscape",
      "American Impressionism",
      "American genre",
    ],
  },
};

const CULTURES = Object.keys(CULTURE_QUERIES) as CultureId[];

// Global book pool by genre (§8.5). Order matters: the genre buckets are filled
// first; popular fiction soaks up the remainder to BOOK_TARGET.
const BOOK_BUCKETS: { topic?: string; label: string; count: number }[] = [
  { topic: "poetry", label: "poetry", count: 75 },
  { topic: "drama", label: "drama", count: 70 },
  { topic: "essays", label: "essays", count: 60 },
  { topic: "history", label: "history", count: 85 },
  { topic: "science", label: "science", count: 50 },
  { topic: "philosophy", label: "philosophy", count: 50 },
  { label: "fiction", count: 200 },
];

// --- Wikimedia Commons supplement (§8.2) -------------------------------------
// The Met is thin on a few cultures (no single department + niche search terms),
// so their candidate pools are shallow and a flaky run can leave repeats. Commons
// tops them up to ART_PER_CULTURE (helpers + license rules in fetch-utils.ts).

// Department-scoped cultures whose Met pool is on-theme but shallow/repetitive, so
// we still cap the Met and blend Commons for variety (§9). Plains art at the Met is
// almost entirely one Cheyenne ledger album.
const BLEND_COMMONS = new Set<CultureId>(["plains_lakota"]);

const COMMONS_QUERIES: Partial<Record<CultureId, string[]>> = {
  mesoamerica: ["Maya civilization art", "Aztec sculpture", "Olmec colossal head"],
  pacific_northwest: ["Haida art", "Tlingit art", "Northwest Coast totem pole"],
  mali_songhai: ["Djenné architecture Mali", "Dogon art Mali", "Bamana sculpture"],
  plains_lakota: [
    "Lakota art",
    "Sioux beadwork",
    "Plains Indian ledger art",
    "Plains hide painting",
  ],
  ancient_india: [
    "Maurya Empire sculpture",
    "Indus Valley civilization seal",
    "Gandhara Buddha",
    "Sanchi Stupa",
  ],
  viking_norse: [
    "Viking Age archaeology",
    "runestone Scandinavia",
    "Oseberg ship burial",
    "Norse art Scandinavia",
  ],
  polynesia: ["Polynesian art", "Māori carving", "Marquesas Islands tiki", "Hawaiian artifact"],
};

async function fetchCommonsArt(culture: CultureId, need: number): Promise<unknown[]> {
  const queries = COMMONS_QUERIES[culture];
  if (!queries || need <= 0) return [];
  const out: unknown[] = [];
  const seen = new Set<number>();

  for (const q of queries) {
    if (out.length >= need) break;
    const params = new URLSearchParams({
      action: "query",
      format: "json",
      generator: "search",
      gsrnamespace: "6", // File:
      gsrlimit: "25",
      gsrsearch: `filetype:bitmap ${q}`,
      prop: "imageinfo",
      iiprop: "url|size|user|extmetadata",
      iiurlwidth: "960", // a standard Commons thumbnail width (others are refused)
    });
    let data: any;
    try {
      data = await commonsJSON(params);
    } catch (e) {
      console.warn(`  commons search failed ${culture}/${q}: ${(e as Error).message}`);
      continue;
    }
    const pages: any[] = data?.query?.pages ? Object.values(data.query.pages) : [];
    for (const p of pages) {
      if (out.length >= need) break;
      if (seen.has(p.pageid)) continue;
      const info = p.imageinfo?.[0];
      const meta = info?.extmetadata;
      if (!info || !meta) continue;
      const licenseShort = stripHtml(meta.LicenseShortName?.value) ?? "";
      if (!COMMONS_OK.test(licenseShort) && !COMMONS_OK.test(meta.License?.value ?? "")) continue;
      if (!info.url) continue;
      const src = commonsThumb(info.url, info.width ?? 0, info.thumburl, 960);
      const file = `commons-${p.pageid}.jpg`;
      try {
        await commonsDownload(src, join(IMG_DIR, file));
      } catch {
        continue;
      }
      seen.add(p.pageid);
      const title =
        stripHtml(meta.ObjectName?.value) ??
        String(p.title || "Untitled")
          .replace(/^File:/, "")
          .replace(/\.[a-z0-9]+$/i, "");
      out.push({
        id: `commons-${p.pageid}`,
        title,
        creator: stripHtml(meta.Artist?.value),
        date: stripHtml(meta.DateTimeOriginal?.value),
        culture,
        imageUrl: `/content/images/${file}`,
        thumbUrl: `/content/images/${file}`,
        source: {
          provider: "Wikimedia Commons",
          providerUrl: info.descriptionurl || `https://commons.wikimedia.org/?curid=${p.pageid}`,
          license: normalizeLicense(licenseShort),
          attributionText: commonsAttribution(
            stripHtml(meta.Artist?.value),
            stripHtml(meta.Credit?.value),
            info.user,
          ),
          rightsNote: licenseShort || undefined,
        },
      });
      console.log(`  ✓ ${culture} (Commons): ${String(title).slice(0, 46)}`);
      await sleep(40);
    }
  }
  return out;
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

  // Cap the Met share (and blend in curated Commons below) when its pool is either
  // noisy — cultures without a clean department search the whole collection — or
  // on-theme but shallow/repetitive (BLEND_COMMONS, e.g. Plains art at the Met is
  // mostly one ledger album). Otherwise a department-scoped culture takes it all.
  const metCap =
    (cfg.departmentId === undefined || BLEND_COMMONS.has(culture)) && COMMONS_QUERIES[culture]
      ? Math.ceil(ART_PER_CULTURE / 2)
      : ART_PER_CULTURE;

  const candidates = shuffle([...new Set(ids)]);
  const out: unknown[] = [];
  let attempts = 0;
  for (const id of candidates) {
    if (out.length >= metCap || attempts >= MAX_ART_ATTEMPTS) break;
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
  // Top thin cultures up from Wikimedia Commons (§8.2) so the pool stays deep.
  if (out.length < ART_PER_CULTURE && COMMONS_QUERIES[culture]) {
    const supplement = await fetchCommonsArt(culture, ART_PER_CULTURE - out.length);
    out.push(...supplement);
  }
  if (out.length < ART_PER_CULTURE) {
    console.warn(
      `  ⚠ ${culture}: only ${out.length}/${ART_PER_CULTURE} (thin — placeholders fill the gaps)`,
    );
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
    for (let page = 1; collected < bucket.count && out.length < BOOK_TARGET && page <= 20; page++) {
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
            popularity: b.download_count ?? 0, // weights the featured/legible tier at runtime (§8.5, B1)
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

const MANIFEST = join(OUT, "manifest.json");
const saveManifest = (manifest: unknown) => writeFile(MANIFEST, JSON.stringify(manifest, null, 2));

/**
 * Fetch exhibit pools for the given categories (§9.1), merging each into the
 * manifest and saving as it goes — an interrupted run keeps everything it got,
 * and `EXHIBITS_ONLY=missing` picks up where it left off.
 */
async function fetchExhibits(categories: ExhibitCategoryId[], manifest: any) {
  const apiKey = process.env.SMITHSONIAN_API_KEY?.trim() || undefined;
  if (!apiKey) {
    console.warn(
      "  ⚠ SMITHSONIAN_API_KEY not set — specimen photos will come from Wikimedia Commons only.\n" +
        "    (Get a free key at https://api.data.gov/signup/ and put it in .env.local.)",
    );
  }
  await mkdir(EXHIBIT_DIR, { recursive: true });
  manifest.exhibitsByCategory ??= {};
  for (const [i, category] of categories.entries()) {
    process.stdout.write(`  [${i + 1}/${categories.length}] `);
    manifest.exhibitsByCategory[category] = await fetchExhibitPool(
      category,
      EXHIBIT_DIR,
      EXHIBIT_URL,
      apiKey,
    );
    await saveManifest(manifest);
  }
}

/**
 * Which categories an EXHIBITS_ONLY value means: "1"/"all" = every category,
 * "missing" = those not cached yet (resume), else a comma-separated list.
 */
function exhibitList(value: string, manifest: any): ExhibitCategoryId[] {
  const v = value.trim();
  if (/^(1|all|true)$/i.test(v)) return EXHIBIT_CATEGORY_IDS;
  if (/^missing$/i.test(v)) {
    const have = manifest.exhibitsByCategory ?? {};
    return EXHIBIT_CATEGORY_IDS.filter((c) => !(have[c]?.plates?.length > 0));
  }
  const wanted = v
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  const unknown = wanted.filter((c) => !EXHIBIT_CATEGORY_IDS.includes(c as ExhibitCategoryId));
  if (unknown.length) throw new Error(`Unknown exhibit categories: ${unknown.join(", ")}`);
  return wanted as ExhibitCategoryId[];
}

async function main() {
  // Exhibits-only merge mode: refresh hallway exhibits without touching art or
  // texts — `EXHIBITS_ONLY=1` (all), `=missing` (resume), `=coleoptera,odonata`.
  if (process.env.EXHIBITS_ONLY) {
    const manifest = JSON.parse(await readFile(MANIFEST, "utf8"));
    const categories = exhibitList(process.env.EXHIBITS_ONLY, manifest);
    if (categories.length === EXHIBIT_CATEGORY_IDS.length) {
      // A full refresh: start clean so superseded images don't pile up. Empty the
      // folder rather than delete it (Windows refuses if anything holds it open).
      await mkdir(EXHIBIT_DIR, { recursive: true });
      for (const f of await readdir(EXHIBIT_DIR)) await rm(join(EXHIBIT_DIR, f), { force: true });
      manifest.exhibitsByCategory = {};
    }
    console.log(`Fetching hallway exhibits — ${categories.length} categories`);
    await fetchExhibits(categories, manifest);
    console.log(`\nMerged exhibits for ${categories.length} categories.`);
    return;
  }

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

  // Save art + books now, so a long exhibits phase can be interrupted safely.
  const manifest: any = { generatedAt: new Date().toISOString(), artByCulture, books };
  await saveManifest(manifest);

  console.log("Fetching hallway exhibits (§9.1)…");
  await fetchExhibits(EXHIBIT_CATEGORY_IDS, manifest);

  const artCount = Object.values(artByCulture).reduce((n, a) => n + a.length, 0);
  console.log(
    `\nDone — ${artCount} artworks, ${books.length} books, ` +
      `${Object.keys(manifest.exhibitsByCategory).length} exhibit categories → ${MANIFEST}`,
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
