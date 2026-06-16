import { useEffect } from "react";
import type { Room } from "../model/types";
import { useMuseumStore } from "../state/store";
import { ArtViewer } from "./overlays/ArtViewer";
import { Reader } from "./overlays/Reader";
import { CreditsPanel } from "./overlays/CreditsPanel";

/** Renders whichever 2D overlay is open (§7); Esc closes it. */
export function Overlays({ room }: { room: Room }) {
  const overlay = useMuseumStore((s) => s.overlay);
  const activeArtwork = useMuseumStore((s) => s.activeArtwork);
  const activeBook = useMuseumStore((s) => s.activeBook);
  const closeOverlay = useMuseumStore((s) => s.closeOverlay);

  useEffect(() => {
    if (overlay === "none") return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeOverlay();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [overlay, closeOverlay]);

  if (overlay === "none") return null;

  return (
    <div className="overlay-root">
      {overlay === "art" && activeArtwork && <ArtViewer artwork={activeArtwork} onClose={closeOverlay} />}
      {overlay === "reader" && activeBook && <Reader book={activeBook} onClose={closeOverlay} />}
      {overlay === "credits" && <CreditsPanel room={room} onClose={closeOverlay} />}
    </div>
  );
}
