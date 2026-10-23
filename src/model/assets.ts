import type { Artwork, Hallway, Museum, Room, SourceRef } from "./types";

export type AssetKind = "painting" | "artifact" | "centerpiece" | "book" | "plate" | "specimen";

export interface AssetEntry {
  id: string;
  title: string;
  kind: AssetKind;
  creator?: string;
  source: SourceRef;
}

/**
 * Every attributable asset currently loaded in a room (§7.3 / §8.4) — including
 * the exhibits in the hallways off its doorways (§9.1) — de-duped by kind+id
 * (books are sampled from a shared pool, so they can repeat).
 */
export function collectRoomAssets(room: Room, hallways: Hallway[] = []): AssetEntry[] {
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

  for (const h of hallways) {
    for (const e of h.exhibits) {
      push({
        id: e.id,
        title: e.title,
        kind: e.display === "case" ? "specimen" : "plate",
        creator: e.creator,
        source: e.source,
      });
    }
  }

  return out;
}

/** The hallways opening off a room's doorways (§2.7). */
export function roomHallways(room: Room, hallways: Map<string, Hallway>): Hallway[] {
  const out: Hallway[] = [];
  for (const e of room.exits) {
    const h = e.hallwayId ? hallways.get(e.hallwayId) : undefined;
    if (h) out.push(h);
  }
  return out;
}

/**
 * Every cached image URL referenced on one floor — its rooms and its hallways
 * (texture budget, §12). On a floor change we keep these and dispose all other
 * tracked textures (see scene/textureBudget.ts), bounding GPU texture memory to
 * one floor.
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
  for (const h of floor.hallways ?? []) h.exhibits.forEach(add);
  return urls;
}
