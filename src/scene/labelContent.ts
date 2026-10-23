import type { Artwork } from "../model/types";
import type { LabelContent } from "./canvasTextures";

/** What a museum label says about an artwork, artifact or specimen (§7 / §9.1). */
export function labelFor(a: Artwork): LabelContent {
  const by = [a.creator, a.date].filter(Boolean).join(" · ");
  return {
    title: a.title,
    lines: by ? [by] : [],
    footer: `${a.source.provider} · ${a.source.license}`,
  };
}
