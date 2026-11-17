import type { Artwork, SourceRef } from "../model/types";
import type { LabelContent } from "./canvasTextures";

/** How to show a license: the code, or for "other" the owner's own rights note
 *  (e.g. "Own photograph — personal use", §8.6). */
export function licenseText(s: SourceRef): string {
  return s.license === "other" && s.rightsNote ? s.rightsNote : s.license;
}

/** What a museum label says about an artwork, artifact or specimen (§7 / §9.1). */
export function labelFor(a: Artwork): LabelContent {
  const by = [a.creator, a.date].filter(Boolean).join(" · ");
  return {
    title: a.title,
    lines: by ? [by] : [],
    footer: `${a.source.provider} · ${licenseText(a.source)}`,
  };
}
