import { useEffect } from "react";
import type { Room } from "../model/types";
import { useMuseumStore } from "../state/store";

/** 2D heads-up layer over the canvas (§7): title, reticle + hover label, enter
 *  prompt, Sources button, and a transient exit toast. */
export function Hud({ room }: { room: Room }) {
  const isLocked = useMuseumStore((s) => s.isLocked);
  const overlay = useMuseumStore((s) => s.overlay);
  const hovered = useMuseumStore((s) => s.hovered);
  const exitToast = useMuseumStore((s) => s.exitToast);
  const clearExitToast = useMuseumStore((s) => s.clearExitToast);
  const openCredits = useMuseumStore((s) => s.openCredits);

  useEffect(() => {
    if (!exitToast) return;
    const timer = setTimeout(clearExitToast, 2400);
    return () => clearTimeout(timer);
  }, [exitToast, clearExitToast]);

  // "C" opens the Sources panel (and frees the pointer so it's usable).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code === "KeyC" && useMuseumStore.getState().overlay === "none") {
        openCredits();
        document.exitPointerLock();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [openCredits]);

  const overlayOpen = overlay !== "none";

  return (
    <>
      <div className="hud">
        <h1>{room.title}</h1>
        <p className="hud__sub">Library of Babel · Phase 2</p>
        <p className="hud__hint">
          <b>WASD</b> move · <b>mouse</b> look · <b>click</b> items · <b>C</b> sources · <b>Esc</b> back
        </p>
      </div>

      <button className="sources-btn" onClick={openCredits}>
        Sources
      </button>

      {isLocked && !overlayOpen && (
        <div className="reticle" aria-hidden="true">
          <span className={`reticle__dot${hovered ? " reticle__dot--active" : ""}`} />
          {hovered && <span className="reticle__label">{hovered.label}</span>}
        </div>
      )}

      {!isLocked && !overlayOpen && (
        <div className="prompt" aria-hidden="true">
          <p className="prompt__title">Enter the Library</p>
          <p className="prompt__body">
            Click to explore · <b>WASD</b> move · <b>mouse</b> look · <b>Esc</b> release
          </p>
        </div>
      )}

      {exitToast && !overlayOpen && (
        <div className="toast" role="status">
          <b>{exitToast}</b>
          <span className="toast__note">Doorway — walking through arrives in Phase 3</span>
        </div>
      )}
    </>
  );
}
