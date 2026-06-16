import type { Artwork, BookRef } from "../model/types";

export type InteractKind = "painting" | "book" | "artifact" | "centerpiece" | "exit";

/** Stamped onto a mesh's `userData` to make it raycast-interactable (§6.5).
 *  Carries the underlying asset so a click can open the right overlay (§7). */
export interface InteractableData {
  interactable: true;
  kind: InteractKind;
  id: string;
  label: string;
  artwork?: Artwork; // painting | artifact | centerpiece
  book?: BookRef; // book
  targetRoomId?: string; // exit
}

export function interactable(data: Omit<InteractableData, "interactable">): InteractableData {
  return { interactable: true, ...data };
}
