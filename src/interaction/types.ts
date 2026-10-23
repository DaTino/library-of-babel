import type { Artwork, BookRef } from "../model/types";

export type InteractKind =
  | "painting"
  | "book"
  | "artifact"
  | "centerpiece"
  | "specimen" // a hallway exhibit (§9.1)
  | "exit" // a doorway — hover shows where it leads (walk through to travel)
  | "stairs"; // the up/down flight inside the stair tower (§2.6)

/** Stamped onto a mesh's `userData` to make it raycast-interactable (§6.5).
 *  Carries the underlying asset so a click can open the right overlay (§7). */
export interface InteractableData {
  interactable: true;
  kind: InteractKind;
  id: string;
  label: string;
  artwork?: Artwork; // painting | artifact | centerpiece | specimen
  book?: BookRef; // book
  targetRoomId?: string; // exit | stairs
  climbDir?: 1 | -1; // stairs
}

export function interactable(data: Omit<InteractableData, "interactable">): InteractableData {
  return { interactable: true, ...data };
}
