import type { SourceRef } from "../../model/types";

/** Persistent attribution line shown on every open asset (§7.3 / §8.4). */
export function Attribution({ source }: { source: SourceRef }) {
  return (
    <p className="attribution">
      <span className="attribution__label">Source</span>{" "}
      <a href={source.providerUrl} target="_blank" rel="noopener noreferrer">
        {source.provider}
      </a>
      {" · "}
      <span className="attribution__license">{source.license}</span>
      {source.attributionText ? (
        <span className="attribution__text"> · {source.attributionText}</span>
      ) : null}
    </p>
  );
}
