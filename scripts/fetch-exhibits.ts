/**
 * Hallway exhibits (§9.1): for each of the 36 natural-history categories, a pool
 * of illustrated plates (for the walls) and specimen photographs (for the
 * display cases).
 *
 *  - Plates: public-domain natural-history illustration from Wikimedia Commons —
 *    Haeckel, Merian, Besler, Atkins, and the Biodiversity Heritage Library's
 *    scanned plates (§8.2).
 *  - Specimens: CC0 photographs of real specimens from the Smithsonian's Open
 *    Access API — mostly the National Museum of Natural History's education
 *    collection, plus its botany (herbarium) unit. Needs a free api.data.gov key
 *    in SMITHSONIAN_API_KEY; without one, specimen photos come from Commons.
 *
 * Every image is downloaded twice: a small one for the wall texture (texture
 * budget, §12) and a larger one for the viewer.
 */
import { join } from "node:path";
import type { ExhibitCategoryId } from "../src/model/types";
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

export const PLATES_PER_CATEGORY = 8; // 6 hang at a time → some variety per visit
export const SPECIMENS_PER_CATEGORY = 3; // 2 cases per hallway

const THUMB_PX = 500; // wall texture (a standard Commons thumbnail width)
const FULL_PX = 1280; // art viewer

const SI_API = "https://api.si.edu/openaccess/api/v1.0/search";
const SI_PAGES = 4; // × 100 rows

type Unit = "NMNHEDUCATION" | "NMNHBOTANY" | "NMNHINV" | "NMNHMINSCI";

interface CategoryQueries {
  /** Commons searches for illustrated plates (first ones are the best). */
  plates: string[];
  /** Smithsonian full-text terms (OR-ed), within `units`. */
  si: string;
  units?: Unit[];
  /** Commons searches for specimen photos, used when the Smithsonian is short. */
  photos: string[];
}

const EDU: Unit[] = ["NMNHEDUCATION"];
const EDU_BOTANY: Unit[] = ["NMNHEDUCATION", "NMNHBOTANY"];

export const EXHIBIT_QUERIES: Record<ExhibitCategoryId, CategoryQueries> = {
  coleoptera: {
    plates: ["Coleoptera plate", "beetles chromolithograph", "Käfer Tafel"],
    si: "beetle OR Coleoptera",
    photos: ["Coleoptera specimen museum"],
  },
  lepidoptera: {
    plates: [
      "Lepidoptera plate",
      "butterflies chromolithograph",
      "Metamorphosis insectorum Surinamensium",
    ],
    si: "butterfly OR moth OR Lepidoptera",
    photos: ["butterfly specimen museum"],
  },
  hymenoptera: {
    plates: ["Hymenoptera plate", "Hymenoptera Aculeata plate"],
    si: "bee OR wasp OR ant OR hornet OR Hymenoptera",
    photos: ["Hymenoptera specimen museum"],
  },
  odonata: {
    plates: ["British dragonflies plate", "Odonata plate", "dragonflies plate"],
    si: "dragonfly OR damselfly OR Odonata",
    photos: ["dragonfly specimen museum"],
  },
  orthoptera: {
    plates: ["Orthoptera plate", "grasshoppers plate", "locusts plate illustration"],
    si: "grasshopper OR katydid OR cricket OR locust OR Orthoptera",
    photos: ["Orthoptera specimen museum"],
  },
  mantodea: {
    plates: ["Mantodea plate", "Mantidae plate", "mantis plate illustration"],
    si: "mantis OR Mantodea",
    photos: ["mantis specimen museum"],
  },
  phasmatodea: {
    plates: ["Redtenbacher 1906", "Phasmidae plate", "Phyllium plate"],
    si: '"walking stick" OR "stick insect" OR "leaf insect" OR Phasmida',
    photos: ["Phasmatodea specimen"],
  },
  hemiptera: {
    plates: ["Hemiptera plate", "Cicadidae plate", "Fulgoridae plate"],
    si: 'cicada OR "stink bug" OR "shield bug" OR planthopper OR Hemiptera',
    photos: ["cicada specimen museum"],
  },
  neuroptera: {
    plates: ["Neuroptera plate", "Neuroptera Westwood", "Myrmeleontidae plate"],
    si: "lacewing OR antlion OR owlfly OR Neuroptera",
    photos: ["lacewing specimen"],
  },
  diptera: {
    plates: ["Fauna Germanica Diptera", "Meigen Diptera", "Syrphidae plate"],
    si: "fly OR hoverfly OR Diptera",
    photos: ["Diptera specimen museum"],
  },
  arachnids: {
    plates: ["Haeckel Arachnida", "Arachnida plate", "spiders plate"],
    si: "spider OR scorpion OR tarantula OR Arachnida",
    photos: ["scorpion specimen museum"],
  },
  crustaceans: {
    plates: ["Crustacea plate", "Decapoda plate", "Haeckel Cirripedia"],
    si: "crab OR lobster OR barnacle OR shrimp OR isopod OR Crustacea",
    photos: ["crab specimen museum"],
  },
  myriapods: {
    plates: ["Myriapoda plate", "Chilopoda plate", "Diplopoda plate"],
    si: "centipede OR millipede OR Diplopoda OR Chilopoda",
    photos: ["millipede specimen museum"],
  },
  living_fossils: {
    plates: ["Haeckel Aspidonia", "Limulus plate", "Pycnogonida plate"],
    si: '"horseshoe crab" OR "sea spider" OR Limulus OR Pycnogonida',
    photos: ["horseshoe crab specimen"],
  },
  herbarium: {
    plates: ["herbarium specimen sheet", "herbarium sheet"],
    si: "Rosaceae OR Liliaceae OR Asteraceae OR Ranunculaceae OR Fabaceae",
    units: ["NMNHBOTANY"],
    photos: ["herbarium sheet"],
  },
  ferns_mosses: {
    plates: ["Haeckel Filicinae", "Haeckel Muscinae", "ferns plate"],
    si: "fern OR moss OR horsetail OR Polypodiopsida OR Equisetopsida OR Bryopsida",
    units: EDU_BOTANY,
    photos: ["fern herbarium specimen"],
  },
  seeds_cones: {
    plates: ["seeds plate botanical", "Coniferae plate", "fruits seeds plate"],
    si: 'seed OR cone OR pinecone OR acorn OR "seed pod" OR Pinopsida',
    units: EDU_BOTANY,
    photos: ["seed collection museum"],
  },
  orchids_carnivorous: {
    plates: ["Haeckel Orchideae", "Haeckel Nepenthaceae", "Orchidaceae plate"],
    si: 'orchid OR Orchidaceae OR "pitcher plant" OR Nepenthes OR Sarracenia OR sundew',
    units: EDU_BOTANY,
    photos: ["orchid herbarium specimen"],
  },
  fungi_lichens: {
    plates: ["Haeckel Basimycetes", "Haeckel Lichenes", "fungi plate"],
    si: "mushroom OR fungus OR lichen OR fungi",
    units: EDU_BOTANY,
    photos: ["mushroom specimen museum"],
  },
  seaweeds: {
    plates: ["Anna Atkins cyanotype", "algae plate", "Haeckel Florideae"],
    si: "algae OR seaweed OR kelp",
    units: EDU_BOTANY,
    photos: ["seaweed herbarium specimen"],
  },
  botanical_plates: {
    plates: ["Hortus Eystettensis", "Redouté Les Liliacées", "Redouté Les Roses"],
    si: "Rosa OR Lilium OR Iris OR Tulipa OR Paeonia",
    units: ["NMNHBOTANY"],
    photos: ["herbarium specimen flower"],
  },
  trilobites: {
    plates: ["Barrande trilobites", "Histoire naturelle des crustacés fossiles", "trilobite plate"],
    si: "trilobite OR Trilobita",
    photos: ["trilobite fossil"],
  },
  ammonites: {
    plates: ["Haeckel Ammonitida", "ammonites plate", "Nautilus plate"],
    si: "ammonite OR nautilus OR nautiloid OR Ammonoidea",
    photos: ["ammonite fossil"],
  },
  amber: {
    plates: ["insect in amber", "Bernstein Inkluse", "amber inclusion"],
    si: "amber",
    photos: ["insect in amber"],
  },
  marine_reptiles: {
    plates: ["Ichthyosaurus plate", "Plesiosaurus plate", "Book of the Great Sea-Dragons"],
    si: '"fossil fish" OR ichthyosaur OR plesiosaur OR mosasaur',
    photos: ["ichthyosaur fossil"],
  },
  fossil_plants: {
    plates: ["Histoire des végétaux fossiles", "fossil plants plate", "Carboniferous flora plate"],
    si: '"fossil plant" OR "petrified wood" OR "fossil fern" OR "fossil leaf"',
    photos: ["fossil plant specimen"],
  },
  crinoids: {
    plates: ["Haeckel Crinoidea", "Brachiopoda plate", "crinoid fossil plate"],
    si: 'crinoid OR "sea lily" OR brachiopod',
    photos: ["crinoid fossil"],
  },
  teeth_bones: {
    plates: [
      "A pictorial atlas of fossil remains",
      "fossil teeth plate",
      "Dinosaur skeleton plate",
    ],
    si: '"fossil tooth" OR "shark tooth" OR dinosaur OR mammoth OR mastodon OR Theropod',
    photos: ["fossil tooth specimen"],
  },
  shells: {
    plates: ["Conchological Manual Plate", "The elements of conchology", "Conchology plate"],
    si: "snail OR shell OR conch OR cowrie OR scallop OR Gastropoda OR Bivalvia",
    photos: ["seashell collection museum"],
  },
  corals_echinoderms: {
    plates: ["Haeckel Hexacoralla", "Haeckel Echinidea", "Haeckel Asteridea"],
    si: 'coral OR "sea urchin" OR starfish OR "sea star" OR "sand dollar"',
    photos: ["sea urchin specimen museum"],
  },
  jellyfish: {
    plates: ["Haeckel Discomedusae", "Haeckel Siphonophorae", "Medusae plate"],
    si: "jellyfish OR siphonophore OR medusa OR Scyphozoa",
    units: ["NMNHEDUCATION", "NMNHINV"],
    photos: ["jellyfish preserved specimen"],
  },
  microscopic: {
    plates: ["Haeckel Radiolaria", "Haeckel Diatomea", "Radiolaria Challenger plate"],
    si: "radiolarian OR diatom OR foraminifera OR Polythalamea OR Miliolida",
    photos: ["diatoms microscope slide"],
  },
  minerals: {
    plates: [
      "Sowerby British Mineralogy",
      "mineralogy plate crystals",
      "Mineralogie Tafel Kristalle",
    ],
    si: "mineral OR crystal OR geode OR quartz",
    photos: ["mineral specimen museum"],
  },
  meteorites: {
    plates: ["meteorite", "Meteorit", "pallasite"],
    si: "meteorite OR tektite OR pallasite",
    units: ["NMNHEDUCATION", "NMNHMINSCI"],
    photos: ["meteorite specimen"],
  },
  eggs_nests: {
    plates: ["bird eggs plate", "Eggs of British birds", "oology plate"],
    si: "egg OR nest OR feather",
    photos: ["bird egg collection museum"],
  },
  skeletons: {
    plates: [
      "skeleton plate comparative anatomy",
      "Recherches sur les ossemens fossiles",
      "skull plate lithograph",
    ],
    si: "skull OR skeleton",
    photos: ["skull specimen museum"],
  },
};

/** Normalized §4 Artwork (kept loose here — the app types it on load). */
export interface FetchedImage {
  id: string;
  title: string;
  creator?: string;
  date?: string;
  imageUrl: string;
  thumbUrl: string;
  source: {
    provider: string;
    providerUrl: string;
    license: string;
    attributionText?: string;
    rightsNote?: string;
  };
}

// Text pages, title pages, maps, diagrams, and the like aren't exhibits.
const NOT_AN_EXHIBIT =
  /\b(map|stamp|coin|logo|diagram|chart|cover|title|poster|banknote|flag|text\d*|index|labell?ed|types based|contents|signature)\b/i;
const BAD_EXT = /\.(tiff?|svg|gif|webm|pdf|djvu)$/i;
const TEXT_PAGE = /text\d*\.[a-z0-9]+$/i; // "…Plate1text.jpg"
const CAMERA_NAME = /^(img|dsc|dscn|p\d{3,}|photo)[\s_-]?\d+/i;

/** Commons file title → a readable exhibit title. */
function cleanTitle(fileTitle: string): string {
  return fileTitle
    .replace(/^File:/, "")
    .replace(/\.[a-z0-9]+$/i, "")
    .replace(/_/g, " ")
    .replace(/\(\d{7,}\)/g, "") // Flickr ids
    .replace(/\bBHL\s?\d+\b/g, "")
    .replace(/\s{2,}/g, " ")
    .replace(/\s+([),.])/g, "$1")
    .trim();
}

/** Rough identity for "same plate, different upload" (edits, crops, text). */
function plateKey(title: string): string {
  return cleanTitle(title)
    .toLowerCase()
    .replace(/\b(big spots|edit(ed)?|crop(ped)?|retouched|text\d*|\d+px)\b/g, "")
    .replace(/[^a-z0-9]+/g, "");
}

async function fetchCommons(
  queries: string[],
  need: number,
  dir: string,
  urlBase: string,
  seen: Set<string>,
): Promise<FetchedImage[]> {
  // Search every query first, then deal candidates round-robin across them, so a
  // hallway mixes sources instead of hanging eight plates from one book.
  const perQuery: any[][] = [];
  for (const q of queries) {
    const params = new URLSearchParams({
      action: "query",
      format: "json",
      generator: "search",
      gsrnamespace: "6", // File:
      gsrlimit: "30",
      gsrsearch: `filetype:bitmap ${q}`,
      prop: "imageinfo",
      iiprop: "url|size|user|extmetadata",
      iiurlwidth: String(FULL_PX),
    });
    let data: any;
    try {
      data = await commonsJSON(params);
    } catch (e) {
      console.warn(`    commons search failed "${q}": ${(e as Error).message}`);
      continue;
    }
    perQuery.push(
      data?.query?.pages
        ? Object.values(data.query.pages).sort((a: any, b: any) => (a.index ?? 0) - (b.index ?? 0))
        : [],
    );
  }
  // JPEG scans first: PNG thumbnails of the same plate are several times larger.
  const isPng = (p: any) => /\.png$/i.test(String(p.title ?? ""));
  const candidates: any[] = [];
  for (const wantPng of [false, true])
    for (let i = 0; perQuery.some((list) => i < list.length); i++)
      for (const list of perQuery)
        if (i < list.length && isPng(list[i]) === wantPng) candidates.push(list[i]);

  const out: FetchedImage[] = [];
  for (const p of candidates) {
    if (out.length >= need) break;
    const info = p.imageinfo?.[0];
    const meta = info?.extmetadata;
    if (!info || !meta) continue;
    const title = String(p.title ?? "");
    const key = plateKey(title);
    if (seen.has(key) || BAD_EXT.test(title) || TEXT_PAGE.test(title)) continue;
    if (NOT_AN_EXHIBIT.test(title)) continue;
    if (info.width < 700 || info.height < 500) continue;
    const aspect = info.width / info.height;
    if (aspect > 2.2 || aspect < 0.4) continue;
    const licenseShort = stripHtml(meta.LicenseShortName?.value) ?? "";
    if (!COMMONS_OK.test(licenseShort) && !COMMONS_OK.test(meta.License?.value ?? "")) continue;
    if (!info.url) continue;
    const thumb = commonsThumb(info.url, info.width, info.thumburl, THUMB_PX);
    const full = commonsThumb(info.url, info.width, info.thumburl, FULL_PX);

    const id = `commons-${p.pageid}`;
    try {
      await commonsDownload(thumb, join(dir, `${id}.jpg`));
      await commonsDownload(full, join(dir, `${id}-full.jpg`));
    } catch (e) {
      console.warn(
        `    skip ${cleanTitle(title).slice(0, 50)}: ${(e as Error).message.split(" ")[0]}`,
      );
      continue;
    }
    seen.add(key);
    // The file name usually says most (it keeps "Plate 12"); fall back to the
    // object name for camera-style names, and keep it to a label's length.
    const objectName = stripHtml(meta.ObjectName?.value);
    let name = cleanTitle(title);
    if (CAMERA_NAME.test(name) && objectName) name = objectName;
    if (name.length > 100) name = `${name.slice(0, 97).trimEnd()}…`;
    out.push({
      id,
      title: name,
      creator: stripHtml(meta.Artist?.value),
      date: stripHtml(meta.DateTimeOriginal?.value),
      imageUrl: `${urlBase}/${id}-full.jpg`,
      thumbUrl: `${urlBase}/${id}.jpg`,
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
  }
  return out;
}

/** IDS image URL at a given size (path form …/id/ark:/… or query form ?id=…). */
const idsSize = (url: string, px: number) =>
  url.includes("?") ? `${url}&max=${px}` : `${url.replace(/\/$/, "")}/${px}`;

/** Common names often come repeated ("Hoverfly, Syrphid Fly, Syrphid Fly"). */
const tidyName = (t: string) =>
  [
    ...new Set(
      t
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean),
    ),
  ].join(", ");

async function fetchSmithsonian(
  cfg: CategoryQueries,
  need: number,
  apiKey: string,
  dir: string,
  urlBase: string,
): Promise<FetchedImage[]> {
  const units = (cfg.units ?? EDU).map((u) => `unit_code:${u}`).join(" OR ");
  const q = `(${cfg.si}) AND (${units}) AND online_media_type:Images`;
  const candidates: { row: any; media: any }[] = [];
  const seenTitles = new Set<string>();

  for (let page = 0; page < SI_PAGES && candidates.length < need * 6; page++) {
    let data: any;
    try {
      data = await getJSON(
        `${SI_API}?q=${encodeURIComponent(q)}&rows=100&start=${page * 100}`,
        4,
        { "X-Api-Key": apiKey },
        3000,
      );
    } catch (e) {
      console.warn(`    smithsonian search failed: ${(e as Error).message}`);
      break;
    }
    const rows: any[] = data?.response?.rows ?? [];
    for (const row of rows) {
      const dn = row?.content?.descriptiveNonRepeating;
      const media = (dn?.online_media?.media ?? []).find(
        (m: any) => m?.type === "Images" && m?.usage?.access === "CC0" && m?.content,
      );
      const name = tidyName(String(row?.title ?? ""));
      if (!media || !name || seenTitles.has(name.toLowerCase())) continue;
      seenTitles.add(name.toLowerCase());
      candidates.push({ row, media });
    }
    if (rows.length < 100) break;
    await sleep(250);
  }

  const out: FetchedImage[] = [];
  for (const { row, media } of shuffle(candidates)) {
    if (out.length >= need) break;
    const dn = row.content.descriptiveNonRepeating;
    const idx = row.content.indexedStructured ?? {};
    const id = `si-${String(dn.record_ID ?? row.id).replace(/[^a-zA-Z0-9_-]/g, "")}`;
    try {
      await download(idsSize(media.content, THUMB_PX), join(dir, `${id}.jpg`));
      await download(idsSize(media.content, FULL_PX), join(dir, `${id}-full.jpg`));
      await sleep(100);
    } catch {
      continue;
    }
    out.push({
      id,
      title: tidyName(String(row.title)),
      creator: idx.scientific_name?.[0],
      imageUrl: `${urlBase}/${id}-full.jpg`,
      thumbUrl: `${urlBase}/${id}.jpg`,
      source: {
        provider: "Smithsonian National Museum of Natural History",
        providerUrl: dn.record_link || dn.guid || "https://collections.si.edu/",
        license: "CC0",
        attributionText: dn.data_source || undefined,
      },
    });
  }
  return out;
}

/**
 * One category's pools. Plates from Commons; specimens from the Smithsonian when
 * a key is set, topped up from Commons photos. Logs what it found.
 */
export async function fetchExhibitPool(
  category: ExhibitCategoryId,
  dir: string,
  urlBase: string,
  apiKey: string | undefined,
): Promise<{ plates: FetchedImage[]; specimens: FetchedImage[] }> {
  const cfg = EXHIBIT_QUERIES[category];
  const seen = new Set<string>();
  const plates = await fetchCommons(cfg.plates, PLATES_PER_CATEGORY, dir, urlBase, seen);

  let specimens: FetchedImage[] = [];
  if (apiKey) specimens = await fetchSmithsonian(cfg, SPECIMENS_PER_CATEGORY, apiKey, dir, urlBase);
  if (specimens.length < SPECIMENS_PER_CATEGORY) {
    specimens.push(
      ...(await fetchCommons(
        cfg.photos,
        SPECIMENS_PER_CATEGORY - specimens.length,
        dir,
        urlBase,
        seen,
      )),
    );
  }

  const si = specimens.filter((s) => s.id.startsWith("si-")).length;
  console.log(
    `  ✓ ${category}: ${plates.length} plates, ${specimens.length} specimens` +
      (apiKey ? ` (${si} Smithsonian)` : ""),
  );
  return { plates, specimens };
}
