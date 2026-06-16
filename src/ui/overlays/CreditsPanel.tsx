import type { Room } from "../../model/types";
import { collectRoomAssets } from "../../model/assets";

/** Global "Sources & Licenses" view — a compliance requirement (§7.3 / §8.4). */
export function CreditsPanel({ room, onClose }: { room: Room; onClose: () => void }) {
  const assets = collectRoomAssets(room);

  return (
    <div className="overlay overlay--credits">
      <div className="credits">
        <div className="credits__head">
          <h2>Sources &amp; Licenses</h2>
          <button className="overlay__close" onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>
        <p className="credits__intro">
          Every asset currently loaded in <b>{room.title}</b>, with provider and license.
        </p>
        <ul className="credits__list">
          {assets.map((a) => (
            <li key={`${a.kind}:${a.id}`} className="credits__item">
              <span className={`credits__kind credits__kind--${a.kind}`}>{a.kind}</span>
              <span className="credits__title">
                {a.title}
                {a.creator ? ` — ${a.creator}` : ""}
              </span>
              <a
                className="credits__provider"
                href={a.source.providerUrl}
                target="_blank"
                rel="noopener noreferrer"
              >
                {a.source.provider}
              </a>
              <span className="credits__license">{a.source.license}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
