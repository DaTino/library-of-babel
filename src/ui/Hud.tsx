import { useEffect } from "react";
import type { Room } from "../model/types";
import { useMuseumStore } from "../state/store";

/** 2D overlay over the canvas (§7): title, reticle + hover label, enter prompt,
 *  and a transient click toast. Wayfinding stays deliberately minimal (§7.4). */
export function Hud({ room }: { room: Room }) {
  const isLocked = useMuseumStore((s) => s.isLocked);
  const hovered = useMuseumStore((s) => s.hovered);
  const lastClicked = useMuseumStore((s) => s.lastClicked);
  const clearClicked = useMuseumStore((s) => s.clearClicked);

  useEffect(() => {
    if (!lastClicked) return;
    const timer = setTimeout(clearClicked, 2400);
    return () => clearTimeout(timer);
  }, [lastClicked, clearClicked]);

  return (
    <>
      <div className="hud">
        <h1>{room.title}</h1>
        <p className="hud__sub">Library of Babel · Phase 1</p>
        <p className="hud__hint">
          <b>WASD</b> move · <b>mouse</b> look · <b>click</b> items · <b>Esc</b> release
        </p>
      </div>

      <div className="reticle" aria-hidden="true">
        <span className={`reticle__dot${hovered ? " reticle__dot--active" : ""}`} />
        {isLocked && hovered && <span className="reticle__label">{hovered.label}</span>}
      </div>

      {!isLocked && (
        <div className="prompt" aria-hidden="true">
          <p className="prompt__title">Enter the Library</p>
          <p className="prompt__body">
            Click to explore · <b>WASD</b> to move · <b>mouse</b> to look · <b>Esc</b> to release
          </p>
        </div>
      )}

      {lastClicked && (
        <div className="toast" role="status">
          <b>{lastClicked.label}</b>
          <span className="toast__note">
            {lastClicked.kind === "exit"
              ? "Doorway — walking through arrives in Phase 3"
              : "Viewer / reader arrives in Phase 2"}
          </span>
        </div>
      )}
    </>
  );
}
