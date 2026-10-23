import type { Artwork, Exhibit, ExhibitCategoryId, SourceRef } from "../model/types";
import { EXHIBIT_SLOTS } from "../geometry/hallway";

/**
 * Natural-history exhibit categories (§9.1) — one per hallway, 36 in all, so no
 * category repeats anywhere in the tower. Which hallway gets which category is
 * authored in config/hallways.ts.
 */
export type ExhibitGroup = "insects" | "arthropods" | "plants" | "fossils" | "sea" | "earth";

export interface ExhibitCategory {
  title: string; // shown as the hallway's name
  subtitle: string; // the scientific grouping
  group: ExhibitGroup;
}

export const EXHIBIT_CATEGORIES: Record<ExhibitCategoryId, ExhibitCategory> = {
  coleoptera: { title: "Beetles", subtitle: "Coleoptera", group: "insects" },
  lepidoptera: { title: "Butterflies & Moths", subtitle: "Lepidoptera", group: "insects" },
  hymenoptera: { title: "Bees, Wasps & Ants", subtitle: "Hymenoptera", group: "insects" },
  odonata: { title: "Dragonflies & Damselflies", subtitle: "Odonata", group: "insects" },
  orthoptera: {
    title: "Grasshoppers, Katydids & Crickets",
    subtitle: "Orthoptera",
    group: "insects",
  },
  mantodea: { title: "Mantises", subtitle: "Mantodea", group: "insects" },
  phasmatodea: { title: "Stick & Leaf Insects", subtitle: "Phasmatodea", group: "insects" },
  hemiptera: { title: "Cicadas & True Bugs", subtitle: "Hemiptera", group: "insects" },
  neuroptera: { title: "Lacewings & Antlions", subtitle: "Neuroptera", group: "insects" },
  diptera: { title: "Flies", subtitle: "Diptera", group: "insects" },

  arachnids: { title: "Spiders & Scorpions", subtitle: "Arachnida", group: "arthropods" },
  crustaceans: { title: "Crabs, Lobsters & Barnacles", subtitle: "Crustacea", group: "arthropods" },
  myriapods: { title: "Centipedes & Millipedes", subtitle: "Myriapoda", group: "arthropods" },
  living_fossils: {
    title: "Horseshoe Crabs & Sea Spiders",
    subtitle: "Xiphosura & Pycnogonida",
    group: "arthropods",
  },

  herbarium: { title: "The Herbarium", subtitle: "Pressed plants", group: "plants" },
  ferns_mosses: {
    title: "Ferns, Mosses & Horsetails",
    subtitle: "Pteridophytes & Bryophytes",
    group: "plants",
  },
  seeds_cones: { title: "Seeds, Cones & Pods", subtitle: "Spermatophytes", group: "plants" },
  orchids_carnivorous: {
    title: "Orchids & Carnivorous Plants",
    subtitle: "Orchidaceae · Nepenthaceae",
    group: "plants",
  },
  fungi_lichens: { title: "Fungi & Lichens", subtitle: "Fungi", group: "plants" },
  seaweeds: { title: "Seaweeds", subtitle: "Algae", group: "plants" },
  botanical_plates: { title: "Botanical Plates", subtitle: "Florilegia", group: "plants" },

  trilobites: { title: "Trilobites", subtitle: "Trilobita", group: "fossils" },
  ammonites: { title: "Ammonites & Nautiloids", subtitle: "Cephalopoda", group: "fossils" },
  amber: { title: "Insects in Amber", subtitle: "Inclusions", group: "fossils" },
  marine_reptiles: {
    title: "Fossil Fish & Sea Dragons",
    subtitle: "Ichthyosaurs · Plesiosaurs",
    group: "fossils",
  },
  fossil_plants: { title: "Fossil Plants", subtitle: "Palaeobotany", group: "fossils" },
  crinoids: {
    title: "Sea Lilies & Lamp Shells",
    subtitle: "Crinoidea · Brachiopoda",
    group: "fossils",
  },
  teeth_bones: { title: "Teeth & Bones", subtitle: "Vertebrate palaeontology", group: "fossils" },

  shells: { title: "Shells", subtitle: "Mollusca", group: "sea" },
  corals_echinoderms: {
    title: "Corals, Urchins & Starfish",
    subtitle: "Anthozoa · Echinodermata",
    group: "sea",
  },
  jellyfish: { title: "Jellyfish & Siphonophores", subtitle: "Medusozoa", group: "sea" },
  microscopic: { title: "Radiolarians & Diatoms", subtitle: "The microscopic", group: "sea" },

  minerals: { title: "Minerals & Crystals", subtitle: "Mineralogy", group: "earth" },
  meteorites: { title: "Meteorites", subtitle: "Stones from the sky", group: "earth" },
  eggs_nests: { title: "Eggs, Nests & Feathers", subtitle: "Oology", group: "earth" },
  skeletons: { title: "Skulls & Skeletons", subtitle: "Osteology", group: "earth" },
};

export const EXHIBIT_CATEGORY_IDS = Object.keys(EXHIBIT_CATEGORIES) as ExhibitCategoryId[];

/** How many of each display type a hallway holds (from its slot layout). */
export const PLATES_PER_HALLWAY = EXHIBIT_SLOTS.filter((s) => s.display === "plate").length;
export const CASES_PER_HALLWAY = EXHIBIT_SLOTS.filter((s) => s.display === "case").length;

const PLACEHOLDER_IMG = "/placeholder-art.svg";

const placeholderSource: SourceRef = {
  provider: "Placeholder Collection",
  providerUrl: "#",
  license: "CC0",
  rightsNote: "Placeholder — run `npm run fetch:content` for real, sourced exhibits (§8).",
};

export function placeholderExhibit(
  id: string,
  category: ExhibitCategoryId,
  display: Exhibit["display"],
): Exhibit {
  const c = EXHIBIT_CATEGORIES[category];
  return {
    id,
    title: display === "case" ? `Specimen — ${c.title}` : `Plate — ${c.title}`,
    creator: c.subtitle,
    imageUrl: PLACEHOLDER_IMG,
    thumbUrl: PLACEHOLDER_IMG,
    source: placeholderSource,
    display,
    category,
  };
}

/**
 * Lay a hallway's exhibits into its 8 slots (§9.1): plates on the walls,
 * specimens in the cases. Short pools borrow from each other (a plate can stand
 * in a case, a specimen photo can hang on the wall), then placeholders fill any
 * remaining gap — so every hallway is always fully hung.
 */
export function arrangeExhibits(
  hallwayId: string,
  category: ExhibitCategoryId,
  plates: Artwork[],
  specimens: Artwork[],
): Exhibit[] {
  // Each type's own pool first, then the other type's leftovers.
  const forCases = specimens.slice(0, CASES_PER_HALLWAY);
  const forPlates = plates.slice(0, PLATES_PER_HALLWAY);
  const sparePlates = plates.slice(forPlates.length);
  const spareSpecimens = specimens.slice(forCases.length);
  while (forCases.length < CASES_PER_HALLWAY && sparePlates.length)
    forCases.push(sparePlates.shift()!);
  while (forPlates.length < PLATES_PER_HALLWAY && spareSpecimens.length)
    forPlates.push(spareSpecimens.shift()!);

  // Last resort before a placeholder: re-hang something real from this category.
  const everything = [...plates, ...specimens];
  let reuse = 0;

  return EXHIBIT_SLOTS.map((slot, i) => {
    const art =
      (slot.display === "case" ? forCases.shift() : forPlates.shift()) ??
      (everything.length ? everything[reuse++ % everything.length] : undefined);
    if (!art) return placeholderExhibit(`${hallwayId}:exhibit-${i}`, category, slot.display);
    return { ...art, display: slot.display, category };
  });
}
