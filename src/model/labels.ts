import type { CultureId } from "./types";

const TITLES: Record<CultureId, string> = {
  egypt: "Ancient Egypt",
  mesoamerica: "Meso-America",
  greece: "Ancient Greece",
  china: "Pre-Yuan China",
  renaissance_italy: "Renaissance Italy",
  tudor_england: "Elizabethan / Tudor England",
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
