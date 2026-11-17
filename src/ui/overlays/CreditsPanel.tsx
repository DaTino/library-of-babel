import type { Hallway, MusicTrack, Room } from "../../model/types";
import { collectRoomAssets, roomHallways } from "../../model/assets";
import { licenseText } from "../../scene/labelContent";

/** Global "Sources & Licenses" view — a compliance requirement (§7.3 / §8.4).
 *  Covers the room, the exhibits in the hallways off its doorways (§9.1), the
 *  room's music, and the house music heard in those hallways (§6.6). */
export function CreditsPanel({
  room,
  hallways,
  houseMusic,
  onClose,
}: {
  room: Room;
  hallways: Map<string, Hallway>;
  houseMusic?: MusicTrack[];
  onClose: () => void;
}) {
  const assets = collectRoomAssets(room, roomHallways(room, hallways));
  const roomMusic = room.theme.music ?? [];
  const house = houseMusic ?? [];

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
          Every asset currently loaded in <b>{room.title}</b> and the hallways off it, with provider
          and license.
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
              <span className="credits__license">{licenseText(a.source)}</span>
            </li>
          ))}
          {roomMusic.map((t) => (
            <MusicItem key={`music:${t.id}`} track={t} />
          ))}
          {house.length > 0 && (
            <li className="credits__group">
              House music — the hallways, the atria and the stair
              {roomMusic.length === 0 ? ", and this room" : ""}
            </li>
          )}
          {house.map((t) => (
            <MusicItem key={`house:${t.id}`} track={t} />
          ))}
        </ul>
        {roomMusic.length === 0 && house.length === 0 && (
          <p className="credits__audio">Ambient audio — procedurally generated · CC0 (own work)</p>
        )}
      </div>
    </div>
  );
}

function MusicItem({ track }: { track: MusicTrack }) {
  const by = track.source.attributionText;
  return (
    <li className="credits__item">
      <span className="credits__kind credits__kind--music">music</span>
      <span className="credits__title" title={by ? `${track.title} — ${by}` : track.title}>
        {track.title}
        {track.creator ? ` — ${track.creator}` : ""}
        {track.date ? ` (${track.date})` : ""}
      </span>
      <a
        className="credits__provider"
        href={track.source.providerUrl}
        target="_blank"
        rel="noopener noreferrer"
      >
        {track.source.provider}
      </a>
      <span className="credits__license">{licenseText(track.source)}</span>
    </li>
  );
}
