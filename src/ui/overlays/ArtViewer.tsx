import { useEffect, useRef, useState, type PointerEvent, type WheelEvent } from "react";
import type { Artwork } from "../../model/types";
import { Attribution } from "./Attribution";

const MIN_ZOOM = 1;
const MAX_ZOOM = 6;

/** Full-bleed image with zoom/pan + a persistent attribution line (§7.1). */
export function ArtViewer({ artwork, onClose }: { artwork: Artwork; onClose: () => void }) {
  const [zoom, setZoom] = useState(MIN_ZOOM);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const dragOrigin = useRef<{ x: number; y: number } | null>(null);

  const reset = () => {
    setZoom(MIN_ZOOM);
    setPan({ x: 0, y: 0 });
  };

  useEffect(reset, [artwork.id]);

  const clampZoom = (z: number) => Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, z));

  const onWheel = (e: WheelEvent<HTMLDivElement>) => {
    setZoom((z) => clampZoom(z - e.deltaY * 0.0015));
  };
  const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    dragOrigin.current = { x: e.clientX - pan.x, y: e.clientY - pan.y };
    e.currentTarget.setPointerCapture(e.pointerId);
  };
  const onPointerMove = (e: PointerEvent<HTMLDivElement>) => {
    if (!dragOrigin.current) return;
    setPan({ x: e.clientX - dragOrigin.current.x, y: e.clientY - dragOrigin.current.y });
  };
  const onPointerUp = () => {
    dragOrigin.current = null;
  };

  return (
    <div className="overlay overlay--art">
      <button className="overlay__close" onClick={onClose} aria-label="Close">
        ×
      </button>
      <div
        className="art-stage"
        onWheel={onWheel}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
      >
        <img
          className="art-stage__img"
          src={artwork.imageUrl}
          alt={artwork.title}
          draggable={false}
          style={{ transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})` }}
        />
      </div>
      <div className="art-meta">
        <div className="art-meta__title">
          <h2>{artwork.title}</h2>
          {(artwork.creator ?? artwork.date) && (
            <p className="art-meta__by">
              {[artwork.creator, artwork.date].filter(Boolean).join(" · ")}
            </p>
          )}
        </div>
        <div className="art-meta__controls">
          <button onClick={() => setZoom((z) => clampZoom(z + 0.5))} aria-label="Zoom in">
            +
          </button>
          <button onClick={reset}>Reset</button>
          <button onClick={() => setZoom((z) => clampZoom(z - 0.5))} aria-label="Zoom out">
            −
          </button>
        </div>
        <Attribution source={artwork.source} />
      </div>
    </div>
  );
}
