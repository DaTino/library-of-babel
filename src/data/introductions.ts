import type { CultureId } from "../model/types";

/**
 * Introductory wall text for each gallery (§7.4), shown on a panel beside every
 * doorway into the room, facing its hallway — the museum's "you are entering…".
 * Short, original summaries; dates are the span the room's art is drawn from.
 */
export interface Introduction {
  dates: string;
  text: string;
}

export const CULTURE_INTROS: Record<CultureId, Introduction> = {
  egypt: {
    dates: "c. 3100 – 1070 BCE",
    text: "For three thousand years the Nile's yearly flood sustained one of the longest-lived civilizations on earth. Pharaohs built in stone for eternity, scribes covered temples and tombs with hieroglyphs, and much of what survives was made for the afterlife.",
  },
  mesoamerica: {
    dates: "c. 1500 BCE – 1521 CE",
    text: "From the Olmec of the Gulf Coast to the Maya city-states and the Aztec capital of Tenochtitlan, the peoples of Mesoamerica shared a ritual calendar, the ball game and the temple pyramid. They developed writing, astronomy and the zero independently of the Old World.",
  },
  greece: {
    dates: "c. 1600 – 323 BCE",
    text: "Rival city-states around the Aegean shared gods, games and a language. Between the Bronze Age palaces of Mycenae and the conquests of Alexander, they gave the world democracy, philosophy, theatre and the idealized human figure in marble and bronze.",
  },
  china: {
    dates: "c. 1600 BCE – 1271 CE",
    text: "From the bronze-casters of the Shang to the painters of the Song, Chinese dynasties rose and fell around an unbroken written tradition. Jade, bronze, silk, lacquer and porcelain were worked here with a refinement unmatched for centuries.",
  },
  renaissance_italy: {
    dates: "c. 1300 – 1600",
    text: "In Florence, Venice and Rome, artists and scholars looked back to classical antiquity and forward to something new. Linear perspective, the study of anatomy and a fresh confidence in the individual changed how Europe saw and thought.",
  },
  tudor_england: {
    dates: "1485 – 1603",
    text: "From Henry VII's victory at Bosworth to the death of Elizabeth I, the Tudors remade England: a break with Rome, a navy that ranged across the world, and the age of Shakespeare. Portraiture flourished as a language of power.",
  },
  mesopotamia: {
    dates: "c. 3500 – 539 BCE",
    text: "Between the Tigris and the Euphrates, Sumerians, Akkadians, Babylonians and Assyrians built the first cities and wrote the first literature, pressing cuneiform into clay. Law codes, astronomy and the base-sixty counting behind our minutes and seconds began here.",
  },
  pacific_northwest: {
    dates: "18th – 20th century",
    text: "Along the cedar-forested coast from Alaska to Washington, the Haida, Tlingit, Kwakwaka'wakw and their neighbours carved crests and family histories into poles, masks and bentwood boxes. The bold, flowing formline style is unmistakably theirs.",
  },
  rome: {
    dates: "753 BCE – 476 CE",
    text: "From a city on seven hills, Rome grew into an empire around the Mediterranean, held together by roads, law and the Latin language. Its engineers mastered concrete and the arch; its artists took Greek forms and made them their own.",
  },
  mali_songhai: {
    dates: "c. 1235 – 1591",
    text: "West African empires grew rich on the gold and salt that crossed the Sahara. Timbuktu and Djenné became great centres of Islamic learning, and Mansa Musa's pilgrimage to Mecca in 1324 made Mali famous across the medieval world.",
  },
  napoleonic_france: {
    dates: "1799 – 1815",
    text: "Napoleon Bonaparte seized power in 1799 and crowned himself emperor in 1804. His brief empire redrew the map of Europe, spread a new code of civil law, and gave the arts the austere grandeur of the Empire style.",
  },
  edo_japan: {
    dates: "1603 – 1868",
    text: "Under the Tokugawa shoguns, Japan enjoyed two and a half centuries of peace, largely closed to the outside world. In Edo, Kyoto and Osaka a merchant culture flourished: kabuki theatre, haiku, and the woodblock prints of the floating world.",
  },
  plains_lakota: {
    dates: "18th – 19th century",
    text: "On the Great Plains, the Lakota and neighbouring nations built a way of life around the horse and the buffalo. Painted hides, quillwork, beadwork and ledger drawings record their histories, honours and visions.",
  },
  ancient_india: {
    dates: "c. 2600 BCE – 300 CE",
    text: "From the planned cities of the Indus Valley to the empire of the Mauryas, the subcontinent was home to some of the world's oldest urban life and to great religious traditions. The sculptors of Gandhara and Mathura gave the Buddha one of his first human forms.",
  },
  viking_norse: {
    dates: "c. 793 – 1066",
    text: "Norse seafarers raided, traded and settled from Newfoundland to the river markets of Russia, where silver from the Caliphate changed hands. At home they raised runestones, forged fine metalwork, and told the stories later written down as the sagas.",
  },
  islamic_golden_age: {
    dates: "c. 750 – 1258",
    text: "Under the Abbasid caliphs, Baghdad's House of Wisdom gathered scholars who translated and extended Greek, Persian and Indian learning. Algebra, optics and medicine advanced, while artisans perfected calligraphy, lustreware and geometric ornament.",
  },
  polynesia: {
    dates: "c. 1000 – 1900",
    text: "Navigating by stars, swells and birds, Polynesian voyagers settled the vast triangle between Hawai'i, Aotearoa New Zealand and Rapa Nui. Their carving, tapa cloth and featherwork carry genealogy, rank and the sacred power of mana.",
  },
  american_19c: {
    dates: "1800 – 1900",
    text: "In a century of expansion, civil war and industry, American painters found a national subject in the land itself — the wilderness of the Hudson River School — and later in the quieter light of everyday scenes and Impressionism.",
  },
};

/** Wall text for each floor's atrium, keyed by floor id (§2.6). */
export const FLOOR_INTROS: Record<string, Introduction> = {
  "floor-1": {
    dates: "The tower's foundation",
    text: "The first of the library's hexagons. Six hallways, each a small cabinet of natural history, lead from here to six worlds, from the Nile to Tudor England. The stair at the centre climbs to the galleries above.",
  },
  "floor-2": {
    dates: "The middle of the tower",
    text: "Six more worlds open from this hexagon, from the first cities of Mesopotamia to Edo Japan. The stair at the centre descends to the ground floor and climbs to the Lantern Gallery.",
  },
  "floor-3": {
    dates: "The top of the tower",
    text: "The highest hexagon. Its hallways lead from the Great Plains to Polynesia. The stair at the centre goes down only — there is nothing above but the dark.",
  },
};

/** A fallback for floors added to layout.ts without authored text. */
export const DEFAULT_FLOOR_INTRO: Introduction = {
  dates: "A hexagon of the library",
  text: "Six hallways lead from here to six rooms of the library. The stair at the centre joins it to the floors above and below.",
};
