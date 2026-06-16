import type { Room, SourceRef } from "./types";

export type AssetKind = "painting" | "artifact" | "centerpiece" | "book";

export interface AssetEntry {
  id: string;
  title: string;
  kind: AssetKind;
  creator?: string;
  source: SourceRef;
}

/**
 * Every attributable asset currently loaded in a room (§7.3 / §8.4), de-duped
 * by kind+id (books are sampled from a shared pool, so they can repeat).
 */
export function collectRoomAssets(room: Room): AssetEntry[] {
  const seen = new Set<string>();
  const out: AssetEntry[] = [];

  const push = (entry: AssetEntry) => {
    const key = `${entry.kind}:${entry.id}`;
    if (seen.has(key)) return;
    seen.add(key);
    out.push(entry);
  };

  for (const wall of room.artWalls) {
    push({
      id: wall.painting.id,
      title: wall.painting.title,
      kind: "painting",
      creator: wall.painting.creator,
      source: wall.painting.source,
    });
    push({
      id: wall.shelfItem.id,
      title: wall.shelfItem.title,
      kind: "artifact",
      creator: wall.shelfItem.creator,
      source: wall.shelfItem.source,
    });
    for (const book of wall.shelf) {
      push({
        id: book.id,
        title: book.title,
        kind: "book",
        creator: book.author,
        source: book.source,
      });
    }
  }

  if (room.centerpiece) {
    push({
      id: room.centerpiece.id,
      title: room.centerpiece.title,
      kind: "centerpiece",
      creator: room.centerpiece.creator,
      source: room.centerpiece.source,
    });
  }

  return out;
}
