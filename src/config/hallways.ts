import type { ExhibitCategoryId } from "../model/types";

/**
 * src/config/hallways.ts — which natural-history category hangs in which hallway
 * (§2.7 / §9.1). Like layout.ts, this is the single editable source of truth.
 *
 * Each floor has 12 hallways:
 *   spokes[i] — the hallway between the atrium and ring[i]
 *   rim[i]    — the hallway between ring[i] and ring[i + 1] (wrapping around)
 * where `ring` is that floor's ring order in layout.ts. Every category is used
 * once, so nothing repeats anywhere in the tower. A floor missing from this map
 * falls back to cycling through the category list.
 */
export interface FloorHallways {
  spokes: ExhibitCategoryId[];
  rim: ExhibitCategoryId[];
}

export const HALLWAY_EXHIBITS: Record<string, FloorHallways> = {
  // Ground floor — ring: egypt, mesoamerica, greece, china, renaissance_italy, tudor_england
  "floor-1": {
    spokes: [
      "coleoptera", // → Egypt (the sacred scarab)
      "lepidoptera", // → Meso-America (morphos)
      "ammonites", // → Greece (spirals and proportion)
      "orchids_carnivorous", // → China (the orchid of the scholar-gentleman)
      "botanical_plates", // → Renaissance Italy (the first florilegia)
      "herbarium", // → Tudor England (the age of the great herbals)
    ],
    rim: [
      "trilobites", // Egypt ↔ Meso-America
      "shells", // Meso-America ↔ Greece
      "crustaceans", // Greece ↔ China
      "minerals", // China ↔ Renaissance Italy
      "odonata", // Renaissance Italy ↔ Tudor England
      "teeth_bones", // Tudor England ↔ Egypt
    ],
  },
  // Upper Gallery — ring: mesopotamia, pacific_northwest, rome, mali_songhai, napoleonic_france, edo_japan
  "floor-2": {
    spokes: [
      "seeds_cones", // → Mesopotamia (the first farmers)
      "ferns_mosses", // → Pacific Northwest (temperate rainforest)
      "corals_echinoderms", // → Rome (the Mediterranean)
      "meteorites", // → Mali & Songhai (Saharan meteorites)
      "marine_reptiles", // → Napoleonic France (Cuvier's mosasaur)
      "orthoptera", // → Edo Japan (singing crickets)
    ],
    rim: [
      "hemiptera", // Mesopotamia ↔ Pacific Northwest
      "crinoids", // Pacific Northwest ↔ Rome
      "amber", // Rome ↔ Mali & Songhai (the amber road)
      "mantodea", // Mali & Songhai ↔ Napoleonic France
      "fungi_lichens", // Napoleonic France ↔ Edo Japan
      "myriapods", // Edo Japan ↔ Mesopotamia
    ],
  },
  // The Lantern Gallery — ring: plains_lakota, ancient_india, viking_norse, islamic_golden_age, polynesia, american_19c
  "floor-3": {
    spokes: [
      "eggs_nests", // → Plains Nations (eagle feathers)
      "phasmatodea", // → Ancient India (leaf insects)
      "seaweeds", // → Viking Scandinavia (kelp coasts)
      "microscopic", // → Islamic Golden Age (Ibn al-Haytham's optics)
      "jellyfish", // → Polynesia (the open Pacific)
      "skeletons", // → 19th-century America (the Bone Wars)
    ],
    rim: [
      "hymenoptera", // Plains Nations ↔ Ancient India
      "arachnids", // Ancient India ↔ Viking Scandinavia
      "fossil_plants", // Viking Scandinavia ↔ Islamic Golden Age
      "living_fossils", // Islamic Golden Age ↔ Polynesia
      "neuroptera", // Polynesia ↔ 19th-century America
      "diptera", // 19th-century America ↔ Plains Nations
    ],
  },
};
