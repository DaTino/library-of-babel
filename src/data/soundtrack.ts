import type { CultureId } from "../model/types";

/**
 * The museum's soundtrack (§6.6, §8.7) — openly licensed recordings from
 * Wikimedia Commons, chosen by hand. `npm run fetch:music` (or a full
 * `fetch:content`) checks each file's license on Commons, downloads an MP3 of it
 * into public/content/music/, and writes public/content/music.json; the app
 * streams them. Owner-curated music (§8.6) still wins over these per room.
 *
 * - **House music** — J. S. Bach, played by Kimiko Ishizaka (the CC0 "Open
 *   Goldberg" and "Open Well-Tempered Clavier" projects) — is the Library's own
 *   voice: it plays in the atria, on the stair and in the hallways, and threads
 *   through every walk between rooms.
 * - **Each themed room** has a short playlist of music from (or about) its
 *   culture, played in order and looped.
 *
 * Labels (title/creator/date) are authored here; license, attribution and the
 * source link come from Commons at fetch time. Where nothing suitable is openly
 * licensed — or where songs are a living community's own and shouldn't be used
 * as background — a room gets a field recording of its landscape instead.
 */

export interface SoundtrackPick {
  /** The Commons file page title, "File:…". */
  file: string;
  title: string;
  creator?: string;
  date?: string;
  /** 0–1; default 0.6. Lower for loud or harsh recordings. */
  volume?: number;
}

export interface CulturePlaylist {
  /** One line on why this music, for the docs and the admin page. */
  note: string;
  tracks: SoundtrackPick[];
}

const ISHIZAKA = "Kimiko Ishizaka, piano";
const GOLDBERG = "J. S. Bach, Goldberg Variations BWV 988";
const WTC = "J. S. Bach, The Well-Tempered Clavier I";

export const HOUSE_PLAYLIST: SoundtrackPick[] = [
  {
    file: "File:Kimiko Ishizaka - 01 - Aria.ogg",
    title: `Aria — ${GOLDBERG}`,
    creator: ISHIZAKA,
    date: "2012",
  },
  {
    file: "File:Kimiko Ishizaka - Bach - Well-Tempered Clavier, Book 1 - 01 Prelude No. 1 in C major, BWV 846.ogg",
    title: `Prelude No. 1 in C major — ${WTC}`,
    creator: ISHIZAKA,
    date: "2015",
  },
  {
    file: "File:Kimiko Ishizaka - 14 - Variatio 13 a 2 Clav.ogg",
    title: `Variation 13 — ${GOLDBERG}`,
    creator: ISHIZAKA,
    date: "2012",
  },
  {
    file: "File:Kimiko Ishizaka - Bach - Well-Tempered Clavier, Book 1 - 15 Prelude No. 8 in E-flat minor, BWV 853.ogg",
    title: `Prelude No. 8 in E-flat minor — ${WTC}`,
    creator: ISHIZAKA,
    date: "2015",
  },
  {
    file: "File:Kimiko Ishizaka - Bach - Well-Tempered Clavier, Book 1 - 25 Prelude No. 13 in F-sharp major, BWV 858.ogg",
    title: `Prelude No. 13 in F-sharp major — ${WTC}`,
    creator: ISHIZAKA,
    date: "2015",
  },
  {
    file: "File:Kimiko Ishizaka - 22 - Variatio 21 Canone alla Settima.ogg",
    title: `Variation 21, Canon at the Seventh — ${GOLDBERG}`,
    creator: ISHIZAKA,
    date: "2012",
  },
  {
    file: "File:Kimiko Ishizaka - Bach - Well-Tempered Clavier, Book 1 - 33 Prelude No. 17 in A-flat major, BWV 862.ogg",
    title: `Prelude No. 17 in A-flat major — ${WTC}`,
    creator: ISHIZAKA,
    date: "2015",
  },
  {
    file: "File:Kimiko Ishizaka - Bach - Well-Tempered Clavier, Book 1 - 37 Prelude No. 19 in A major, BWV 864.ogg",
    title: `Prelude No. 19 in A major — ${WTC}`,
    creator: ISHIZAKA,
    date: "2015",
  },
  {
    file: "File:Kimiko Ishizaka - 32 - Aria da Capo Fine.ogg",
    title: `Aria da capo — ${GOLDBERG}`,
    creator: ISHIZAKA,
    date: "2012",
  },
];

export const CULTURE_PLAYLISTS: Record<CultureId, CulturePlaylist> = {
  // --- Ground floor ---
  egypt: {
    note: "No ancient Egyptian music survives in playable form; these are two of the earliest recordings of Egyptian song, made in Cairo before 1925.",
    tracks: [
      {
        file: "File:Aldahre Kata Awsali (c. 1914).ogg",
        title: "Aldahre Kata Awsali",
        creator: "Munira al-Mahdiyya, voice",
        date: "c. 1914",
        volume: 0.55,
      },
      {
        file: "File:Ala fi Sabil Allah.ogg",
        title: "Ala fi Sabil Allah",
        creator: "Sheikh Sayed El-Safti, voice",
        date: "1907–1925",
        volume: 0.55,
      },
    ],
  },
  mesoamerica: {
    note: "Pre-Columbian music is lost and no suitable open recordings of its instruments exist, so: the Neotropical forest — howler monkeys and oropendolas, the dawn chorus heard at Tikal and Palenque today.",
    tracks: [
      {
        file: "File:Montezuma Oropendola (Psarocolius montezuma) (W PSAROCOLIUS MONTEZUMA R1 C4).ogg",
        title: "Montezuma oropendola, song and calls",
        creator: "British Library Sound Archive",
        volume: 0.5,
      },
      {
        file: "File:Black-faced Solitaire (Myadestes melanops) (W MYADESTES RALLOIDES R1 C5).ogg",
        title: "Black-faced solitaire, song",
        creator: "British Library Sound Archive",
        volume: 0.5,
      },
      {
        file: "File:Mantled Howler Monkey (Alouatta palliata) (W ALOUATTA PALLIATA R1 C2).ogg",
        title: "Mantled howler monkeys",
        creator: "British Library Sound Archive",
        volume: 0.4,
      },
    ],
  },
  greece: {
    note: "The Epitaph of Seikilos — the oldest complete surviving composition — then Satie's Gymnopédies, named for the dances of ancient Sparta, on guitar for a lyre-like voice.",
    tracks: [
      {
        file: "File:Ο Επιτάφιος του Σεῖκιλου - Epitaph of Seikilos.ogg",
        title: "Epitaph of Seikilos (1st century AD)",
        creator: "Marcus Harvey, voice",
      },
      {
        file: "File:Satie Gymnopedie No 1 performed by Michael Laucke.flac",
        title: "Gymnopédie No. 1 — Erik Satie",
        creator: "Michael Laucke, guitar",
        date: "2001",
      },
      {
        file: "File:Satie Gymnopedie No 2 performed by Michael Laucke.flac",
        title: "Gymnopédie No. 2 — Erik Satie",
        creator: "Michael Laucke, guitar",
        date: "2001",
      },
      {
        file: "File:Satie Gymnopedie No 3 performed by Michael Laucke.flac",
        title: "Gymnopédie No. 3 — Erik Satie",
        creator: "Michael Laucke, guitar",
        date: "2001",
      },
    ],
  },
  china: {
    note: "The guqin, the seven-string zither of China's scholar-officials — the literati's own instrument.",
    tracks: [
      {
        file: "File:Guqin-Zuiyu Changwan.ogg",
        title: "Zuiyu Changwan (Evening Song of the Drunken Fisherman)",
        creator: "Charlie Huang, guqin",
        date: "2013",
      },
      {
        file: "File:Guqin-Yangguan Sandie.ogg",
        title: "Yangguan Sandie (Three Refrains on the Yang Pass)",
        creator: "Charlie Huang, guqin",
        date: "2013",
      },
    ],
  },
  renaissance_italy: {
    note: "Palestrina's polyphony, and Respighi's orchestration of 16th-century Italian lute dances.",
    tracks: [
      {
        file: "File:The Tudor Consort - 01 - Palestrina - Sicut lilium inter spinas.ogg",
        title: "Sicut lilium inter spinas — Palestrina",
        creator: "The Tudor Consort",
        date: "2010",
      },
      {
        file: "File:Villanella.ogg",
        title: "Villanella, Ancient Airs and Dances I — Respighi, after 16th-century lute music",
        creator: "United States Marine Band",
        date: "2010",
      },
      {
        file: "File:The Tudor Consort - 02 - Palestrina - Kyrie - Missa Sicut lilium inter spinas.ogg",
        title: "Kyrie, Missa Sicut lilium — Palestrina",
        creator: "The Tudor Consort",
        date: "2010",
      },
      {
        file: "File:Missa Papae Marcelli - IV. Sanctus.flac",
        title: "Sanctus, Missa Papae Marcelli — Palestrina",
        creator: "European Archive (via Musopen)",
      },
    ],
  },
  tudor_england: {
    note: "Dowland's lute song and Tallis's choral music — the sound of Elizabeth's court and chapel.",
    tracks: [
      {
        file: "File:Flow, my tears.ogg",
        title: "Flow, my tears — John Dowland",
        creator: "soprano and lute",
        date: "2004",
      },
      {
        file: "File:Tallis - If ye love me.ogg",
        title: "If ye love me — Thomas Tallis",
        creator: "Coro Santa Pazienza",
        date: "2017",
      },
      {
        file: "File:Thomas Tallis Lamentations I (The Tudor Consort).ogg",
        title: "Lamentations of Jeremiah I — Thomas Tallis",
        creator: "The Tudor Consort",
        date: "2005",
      },
    ],
  },

  // --- Upper gallery ---
  mesopotamia: {
    note: "From the land between the rivers: Syriac chant from the Nineveh plain — Aramaic, the late language of Mesopotamia — and an Iraqi maqam singer from Mosul.",
    tracks: [
      {
        file: "File:Ahmed al-Musili, Mawwal.ogg",
        title: "Mawwal",
        creator: "Ahmed Abdul Qadir al-Musili, voice",
        date: "1925",
        volume: 0.55,
      },
      {
        file: "File:Hanna Petros Track 4.ogg",
        title: "Syriac hymn (Sermon of Sadness)",
        creator: "Hanna Petros, voice",
        date: "1931",
        volume: 0.55,
      },
      {
        file: "File:Hanna Petros Track 5.ogg",
        title: "Syriac hymn",
        creator: "Hanna Petros, voice",
        date: "1931",
        volume: 0.55,
      },
    ],
  },
  pacific_northwest: {
    note: "Northwest Coast songs belong to the families and nations that hold them, so this room plays the coastal rainforest instead: rain, wrens, thrushes and ravens.",
    tracks: [
      {
        file: "File:Light Rain Distant Thunder July 5th 2016.wav",
        title: "Light rain and distant thunder in a forest",
        creator: "kvgarlic (Freesound)",
        date: "2016",
        volume: 0.5,
      },
      {
        file: "File:Troglodytes pacificus - Pacific Wren XC120847.ogg",
        title: "Pacific wren, Vancouver Island",
        creator: "Alejandro Erickson (xeno-canto)",
        volume: 0.45,
      },
      {
        file: "File:Catharus ustulatus - Swainson's Thrush XC243415.mp3",
        title: "Swainson's thrush, song",
        creator: "Jonathon Jongsma (xeno-canto)",
        volume: 0.5,
      },
      {
        file: "File:Corvus corax - Northern Raven - XC110257.ogg",
        title: "Common raven",
        creator: "Jonathon Jongsma (xeno-canto)",
        volume: 0.45,
      },
    ],
  },
  rome: {
    note: "Respighi's Pines of Rome: a nocturne on the Janiculum (with a real nightingale) and the chant rising from a catacomb.",
    tracks: [
      {
        file: "File:Respighi Pines of the Janiculum.ogg",
        title: "The Pines of the Janiculum — Respighi, Pines of Rome",
        creator: "United States Marine Band",
        date: "2007",
      },
      {
        file: "File:Respighi Pines near a catacomb.ogg",
        title: "Pines near a Catacomb — Respighi, Pines of Rome",
        creator: "United States Marine Band",
        date: "2007",
      },
    ],
  },
  mali_songhai: {
    note: "The balafon — in the Sundiata epic, the Sosso Bala sounded at the founding of the Mali Empire — played by Néba Solo and the Senufo, and a 1931 recording from what was then French Sudan.",
    tracks: [
      {
        file: "File:Le son du balafon de Neba Solo.ogg",
        title: "Balafon",
        creator: "Néba Solo (recorded by KONE IF)",
        date: "2026",
      },
      {
        file: "File:Koumbasilla, danse de la jeune fille.ogg",
        title: "Koumbasilla, dance of the young girl",
        creator: "Recorded at the Exposition coloniale, Paris",
        date: "1931",
        volume: 0.55,
      },
      {
        file: "File:Le son du balafon de Néba Solo 1.ogg",
        title: "Balafon (II)",
        creator: "Néba Solo (recorded by KONE IF)",
        date: "2026",
      },
      {
        file: "File:Le son de balafon sénoufo.ogg",
        title: "Senufo balafon, Porlahla festival",
        creator: "recorded by KONE IF",
        date: "2026",
      },
      {
        file: "File:L'harmonie du balafon avec les autres instruments.ogg",
        title: "Balafon with drums",
        creator: "recorded by KONE IF",
        date: "2026",
      },
    ],
  },
  napoleonic_france: {
    note: "Piano music of the Empire years — Beethoven's Pathétique (1798) and a nocturne by John Field (1817), the form's inventor.",
    tracks: [
      {
        file: "File:Daniel Veesey - 02 - Sonata 8 Pathetique - II Adagio cantabile.ogg",
        title: "Sonata “Pathétique”, II. Adagio cantabile — Beethoven",
        creator: "Daniel Veesey, piano",
        date: "2009",
      },
      {
        file: "File:Field-NocturneB-flatmajorH37-Stephan.ogg",
        title: "Nocturne No. 5 in B-flat major — John Field",
        creator: "Constantin Stephan, piano",
        date: "2017",
      },
    ],
  },
  edo_japan: {
    note: "Shakuhachi honkyoku — the meditation music of the Edo-period Fuke monks — then court gagaku and a nagauta from the kabuki stage.",
    tracks: [
      {
        file: "File:Shikanotoone.ogg",
        title: "Shika no Tōne (The Distant Cry of the Deer)",
        creator: "Araki Kodō III, shakuhachi",
        date: "c. 1925–1937",
      },
      {
        file: "File:Koromogo-e (c. 1930).ogg",
        title: "Koromogae (saibara)",
        creator: "Imperial Household Music Department",
        date: "c. 1930",
        volume: 0.55,
      },
      {
        file: "File:Naga-uta Urashima (1931).oga",
        title: "Nagauta “Urashima”",
        creator: "from Musik des Orients (Hornbostel)",
        date: "1931",
        volume: 0.55,
      },
    ],
  },

  // --- The Lantern Gallery ---
  plains_lakota: {
    note: "Lakota songs are ceremonial and living, not background music, so this room plays the mixed-grass prairie of the Black Hills: meadowlarks and sparrows.",
    tracks: [
      {
        file: "File:Sturnella neglecta - Western Meadowlark XC254455.mp3",
        title: "Western meadowlarks, Custer State Park, South Dakota",
        creator: "Jonathon Jongsma (xeno-canto)",
        volume: 0.5,
      },
      {
        file: "File:Ammodramus henslowii - Henslow's Sparrow XC136050.ogg",
        title: "Henslow's sparrow, tallgrass prairie",
        creator: "Jonathon Jongsma (xeno-canto)",
        volume: 0.5,
      },
      {
        file: "File:Sturnella neglecta - Western Meadowlark XC254454.mp3",
        title: "Western meadowlark, calls",
        creator: "Jonathon Jongsma (xeno-canto)",
        volume: 0.5,
      },
    ],
  },
  ancient_india: {
    note: "The veena — Saraswati's instrument — in an unhurried alapana in raga Kiravani, then a kriti by Muthuswami Dikshitar.",
    tracks: [
      {
        file: "File:Kiravani-L Ramakrishnan.ogg",
        title: "Raga Kiravani — alapana and tanam",
        creator: "L. Ramakrishnan, veena",
        date: "2004",
      },
      {
        file: "File:Shri Nilotpala Nayike, rendered on the Veena by L Ramakishnan.ogg",
        title: "Shri Nilotpala Nayike — Dikshitar, raga Reetigowla",
        creator: "L. Ramakrishnan, veena",
        date: "2011",
      },
    ],
  },
  viking_norse: {
    note: "Old Scandinavian sounds kept alive in folk tradition: kulning, the high herding call of the summer pastures, and the langeleik, the Norwegian drone zither.",
    tracks: [
      {
        file: "File:Kulning för kor - SMV - SVA BB 5346 04.wav",
        title: "Kulning (herding call), Dalarna",
        creator: "Karin Edvardsson Johansson, voice",
        date: "1954",
        volume: 0.5,
      },
      {
        file: "File:Prestgangaren från Telemarken - SMV - MMT 24 02.wav",
        title: "Prestgangaren, from Telemark — langeleik",
        creator: "Swedish Performing Arts Agency recording",
        date: "1952",
      },
      {
        file: "File:Kulning för kor, växelvis - SMV - SVA BB 5346 06.wav",
        title: "Kulning, call and answer, Dalarna",
        creator: "Swedish Radio folk-music recording",
        date: "1954",
        volume: 0.5,
      },
      {
        file: "File:Nissedans (tomtedans) från Valdres - SMV - MMT 24 05.wav",
        title: "Nissedans, from Valdres — langeleik",
        creator: "Swedish Performing Arts Agency recording",
        date: "1952",
      },
    ],
  },
  islamic_golden_age: {
    note: "The oud — the instrument al-Kindi and al-Farabi wrote their music theory around — and the classical maqam traditions of Baghdad, Istanbul and Persia (with a poem by Saadi).",
    tracks: [
      {
        file: "File:Samaii Hijaz Kar Kurdi (c. 1926).ogg",
        title: "Samai Hijaz Kar Kurd",
        creator: "Chahadé Saadé, oud",
        date: "c. 1926",
        volume: 0.55,
      },
      {
        file: "File:ملا عثمان الموصلي - غزل اصفهان Isfahan Gazel - Uthman al-Mosuli.ogg",
        title: "Gazel in maqam Isfahan",
        creator: "Mulla ʿUthman al-Mawsili, voice; Tanburi Cemil Bey, tanbur",
        date: "c. 1912",
        volume: 0.55,
      },
      {
        file: "File:Taxim Hicaz (c. 1928).ogg",
        title: "Taksim in maqam Hicaz",
        creator: "Ahmed Djewdet",
        date: "c. 1928",
        volume: 0.55,
      },
      {
        file: "File:Mahoor Paravaneh.ogg",
        title: "Mahoor — poem by Saadi",
        creator: "Parvaneh, voice; Habib Samaei, santur",
        date: "1930s",
        volume: 0.55,
      },
    ],
  },
  polynesia: {
    note: "The Hawaiian steel guitar, Polynesia's gift to the 20th century, in recordings from 1915–1925 — beginning with Queen Liliʻuokalani's Aloha ʻOe.",
    tracks: [
      {
        file: "File:William Smith, Walter K. Kolomoku - Aloha Oe.ogg",
        title: "Aloha ʻOe — Liliʻuokalani",
        creator: "William Smith & Walter K. Kolomoku, guitars",
        date: "1915",
        volume: 0.55,
      },
      {
        file: "File:Frank Ferera, Helen Louise - Hawaiian Portuguese Tango.ogg",
        title: "Hawaiian Portuguese Tango",
        creator: "Helen Louise & Frank Ferera, guitars",
        date: "1916",
        volume: 0.55,
      },
      {
        file: "File:Palakiko & Paaluhi (Ferera & Paaluhi) - Hawaiian Hotel.mp3",
        title: "Hawaiian Hotel",
        creator: "Frank Ferera & Anthony Paaluhi, guitars",
        date: "1925",
        volume: 0.55,
      },
    ],
  },
  american_19c: {
    note: "Songs of the American 19th century: Shenandoah, the Shakers' Simple Gifts (1848) — from a utopian community — and Stephen Foster.",
    tracks: [
      {
        file: "File:Shenandoah - United States Air Force Academy Band.mp3",
        title: "Shenandoah (traditional)",
        creator: "United States Air Force Academy Band",
        date: "2009",
      },
      {
        file: "File:SimpleGiftsOldGuardFife.ogg",
        title: "Simple Gifts — Joseph Brackett (Shaker, 1848)",
        creator: "U.S. Army Old Guard Fife and Drum Corps",
        volume: 0.5,
      },
      {
        file: "File:02 Hard Times Come Again No More.ogg",
        title: "Hard Times Come Again No More — Stephen Foster (1854)",
        creator: "Grantyny",
        date: "2009",
      },
    ],
  },
};
