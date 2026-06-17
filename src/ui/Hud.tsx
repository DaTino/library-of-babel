import { useEffect } from "react";
import type { Room } from "../model/types";
import { useMuseumStore } from "../state/store";

/** 2D heads-up layer over the canvas (§7): room title + floor, reticle + hover
 *  label, enter prompt, and the Sources button. Wayfinding stays minimal (§7.4):
 *  R returns to the floor's atrium, C opens Sources. */
export function Hud({ room, floorTitle }: { room: Room; floorTitle: string }) {
  const isLocked = useMuseumStore((s) => s.isLocked);
  const overlay = useMuseumStore((s) => s.overlay);
  const hovered = useMuseumStore((s) => s.hovered);
  const openCredits = useMuseumStore((s) => s.openCredits);
  const requestTravel = useMuseumStore((s) => s.requestTravel);
  const toggleMute = useMuseumStore((s) => s.toggleMute);
  const muted = useMuseumStore((s) => s.muted);
  const audioEnabled = useMuseumStore((s) => s.audioEnabled);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code === "KeyM") {
        useMuseumStore.getState().toggleMute();
        return;
      }
      const st = useMuseumStore.getState();
      if (st.overlay !== "none" || st.isTraveling) return;
      if (e.code === "KeyR") requestTravel(`${room.id.split(":")[0]}:atrium`);
      if (e.code === "KeyC") {
        openCredits();
        document.exitPointerLock();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [requestTravel, openCredits, room.id]);

  const overlayOpen = overlay !== "none";

  return (
    <>
      <div className="hud">
        <h1>{room.title}</h1>
        <p className="hud__sub">Library of Babel · {floorTitle}</p>
        <p className="hud__hint">
          <b>WASD</b> move · <b>mouse</b> look · <b>click</b> items · <b>R</b> atrium · <b>C</b>{" "}
          sources · <b>M</b> mute · <b>Esc</b> back
        </p>
      </div>

      <button
        className="sound-btn"
        onClick={toggleMute}
        aria-label={muted ? "Unmute ambient audio" : "Mute ambient audio"}
      >
        {audioEnabled && muted ? "🔇" : "🔊"}
      </button>
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
            Click to explore · <b>WASD</b> to move · walk through a doorway to travel
          </p>
        </div>
      )}
    </>
  );
}
