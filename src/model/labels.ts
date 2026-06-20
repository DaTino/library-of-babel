import type { CultureId } from "./types";

const TITLES: Record<CultureId, string> = {
  egypt: "Ancient Egypt",
  mesoamerica: "Meso-America",
  greece: "Ancient Greece",
  china: "Pre-Yuan China",
  renaissance_italy: "Renaissance Italy",
  tudor_england: "Elizabethan / Tudor England",
  mesopotamia: "Ancient Mesopotamia",
  pacific_northwest: "Pacific Northwest Coast",
  rome: "Ancient Rome",
  mali_songhai: "Mali & Songhai",
  napoleonic_france: "Napoleonic France",
  edo_japan: "Edo Japan",
  plains_lakota: "Plains Nations (Lakota)",
  ancient_india: "Ancient India (Indus–Maurya)",
  viking_norse: "Viking Age Scandinavia",
  islamic_golden_age: "The Islamic Golden Age",
  polynesia: "Polynesia",
  american_19c: "19th-Century America",
};

export function cultureTitle(culture: CultureId): string {
  return TITLES[culture];
}

/** Friendly name for a room id like "floor-1:egypt" or "floor-1:atrium". */
export function roomDisplayName(roomId: string): string {
  const part = roomId.split(":")[1] ?? roomId;
  if (part === "atrium") return "The Atrium";
  return cultureTitle(part as CultureId);
}
