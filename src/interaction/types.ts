export type InteractKind = "painting" | "book" | "artifact" | "centerpiece" | "exit";

/** Stamped onto a mesh's `userData` to make it raycast-interactable (§6.5). */
export interface InteractableData {
  interactable: true;
  kind: InteractKind;
  id: string;
  label: string;
  targetRoomId?: string; // exits only
}

export function interactable(data: Omit<InteractableData, "interactable">): InteractableData {
  return { interactable: true, ...data };
}
