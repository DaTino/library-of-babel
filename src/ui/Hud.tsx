import { useEffect } from "react";
import type { Hallway, Room } from "../model/types";
import { roomDisplayName } from "../model/labels";
import { useMuseumStore } from "../state/store";

/** 2D heads-up layer over the canvas (§7): where you are (room, or the hallway
 *  you're walking), floor, reticle + hover label, enter prompt, and the Sources
 *  button. Wayfinding stays minimal (§7.4): R returns to the floor's atrium, C
 *  opens Sources; in the stair tower's doorway a hint says which way is which. */
export function Hud({
  room,
  rooms,
  hallways,
  floorTitle,
}: {
  room: Room;
  rooms: Map<string, Room>;
  hallways: Map<string, Hallway>;
  floorTitle: string;
}) {
  const isLocked = useMuseumStore((s) => s.isLocked);
  const overlay = useMuseumStore((s) => s.overlay);
  const hovered = useMuseumStore((s) => s.hovered);
  const openCredits = useMuseumStore((s) => s.openCredits);
  const requestTravel = useMuseumStore((s) => s.requestTravel);
  const toggleMute = useMuseumStore((s) => s.toggleMute);
  const muted = useMuseumStore((s) => s.muted);
  const audioEnabled = useMuseumStore((s) => s.audioEnabled);
  const hallwayId = useMuseumStore((s) => s.hallway?.id ?? null);
  const climb = useMuseumStore((s) => s.climb);
  const stairPrompt = useMuseumStore((s) => s.stairPrompt);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code === "KeyM") {
        useMuseumStore.getState().toggleMute();
        return;
      }
      const st = useMuseumStore.getState();
      if (st.overlay !== "none" || st.isTraveling || st.climb) return;
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
  const hallway = hallwayId ? hallways.get(hallwayId) : undefined;
  const between = hallway?.ends.map((e) => roomDisplayName(e.roomId)).join(" and ");
  const climbingTo = climb ? rooms.get(climb.toRoomId) : undefined;

  const title = climbingTo
    ? climb?.dir === 1
      ? "Ascending the stair"
      : "Descending the stair"
    : (hallway?.title ?? room.title);
  const sub = climbingTo
    ? `toward ${climbingTo.title}`
    : hallway
      ? `${hallway.subtitle} · between ${between}`
      : `Library of Babel · ${floorTitle}`;

  return (
    <>
      <div className="hud">
        <h1>{title}</h1>
        <p className="hud__sub">{sub}</p>
        <p className="hud__hint">
          <b>WASD</b> move · <b>mouse</b> look · <b>click</b> exhibits · <b>R</b> atrium · <b>C</b>{" "}
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

      {isLocked && !overlayOpen && !climb && stairPrompt && (
        <div className="stair-hint" aria-hidden="true">
          {stairPrompt === "both" && (
            <>
              Step into the doorway, then turn <b>left ↑ to ascend</b> or <b>right ↓ to descend</b>
            </>
          )}
          {stairPrompt === "up" && (
            <>
              Step into the doorway to <b>ascend ↑</b>
            </>
          )}
          {stairPrompt === "down" && (
            <>
              Step into the doorway to <b>descend ↓</b>
            </>
          )}
        </div>
      )}

      {!isLocked && !overlayOpen && (
        <div className="prompt" aria-hidden="true">
          <p className="prompt__title">Enter the Library</p>
          <p className="prompt__body">
            Click to explore · <b>WASD</b> to move · walk the hallways between rooms
          </p>
        </div>
      )}
    </>
  );
}
