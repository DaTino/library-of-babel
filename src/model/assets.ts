import type { Artwork, Museum, Room, SourceRef } from "./types";

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

/**
 * Every cached image URL referenced by the rooms on one floor (texture budget,
 * §12). On a floor change we keep these and dispose all other tracked textures
 * (see scene/textureBudget.ts), bounding GPU texture memory to one floor.
 */
export function floorArtUrls(museum: Museum, level: number): Set<string> {
  const urls = new Set<string>();
  const floor = museum.floors.find((f) => f.level === level);
  if (!floor) return urls;

  const add = (a?: Artwork) => {
    if (!a) return;
    urls.add(a.thumbUrl);
    urls.add(a.imageUrl);
  };

  for (const room of floor.rooms) {
    for (const wall of room.artWalls) {
      add(wall.painting);
      add(wall.shelfItem);
    }
    add(room.centerpiece);
  }
  return urls;
}
