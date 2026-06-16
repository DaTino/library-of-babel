import { useEffect, useMemo, useRef, useState } from "react";
import type { BookRef } from "../../model/types";
import { useMuseumStore } from "../../state/store";
import { Attribution } from "./Attribution";
import { loremChapters } from "./loremText";

const CHUNK = 150; // paragraphs rendered per "Continue reading" (lazy load, §7.2)

/** Clean typographic reader (§7.2). Loads the full cached text when present
 *  (Phase 4), lazily by chunk; falls back to placeholder filler otherwise.
 *  Scroll position is kept in session state. */
export function Reader({ book, onClose }: { book: BookRef; onClose: () => void }) {
  const [dark, setDark] = useState(true);
  const [text, setText] = useState<string | null>(null);
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const [visible, setVisible] = useState(CHUNK);
  const scrollRef = useRef<HTMLDivElement>(null);
  const setReadingPosition = useMuseumStore((s) => s.setReadingPosition);

  useEffect(() => {
    setVisible(CHUNK);
    if (!book.readUrl) {
      setText(null);
      setStatus("idle");
      return;
    }
    let cancelled = false;
    setStatus("loading");
    fetch(book.readUrl)
      .then((r) => {
        if (!r.ok) throw new Error(String(r.status));
        return r.text();
      })
      .then((t) => {
        if (!cancelled) {
          setText(t);
          setStatus("idle");
        }
      })
      .catch(() => {
        if (!cancelled) {
          setText(null);
          setStatus("error");
        }
      });
    return () => {
      cancelled = true;
    };
  }, [book.readUrl]);

  const paragraphs = useMemo(() => {
    if (text) {
      return text
        .split(/\n\s*\n/)
        .map((p) => p.replace(/\s+/g, " ").trim())
        .filter(Boolean);
    }
    return loremChapters(book.id);
  }, [text, book.id]);

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = useMuseumStore.getState().readingPositions[book.id] ?? 0;
  }, [book.id, paragraphs.length]);

  const onScroll = () => {
    const el = scrollRef.current;
    if (el) setReadingPosition(book.id, el.scrollTop);
  };

  return (
    <div className={`overlay overlay--reader ${dark ? "reader--dark" : "reader--light"}`}>
      <div className="reader__bar">
        <span className="reader__crumb">
          {book.title}
          {book.author ? ` · ${book.author}` : ""}
        </span>
        <div className="reader__actions">
          <button onClick={() => setDark((d) => !d)}>{dark ? "Light" : "Dark"}</button>
          {book.externalUrl && (
            <a href={book.externalUrl} target="_blank" rel="noopener noreferrer">
              Read at source ↗
            </a>
          )}
          <button className="overlay__close" onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>
      </div>
      <div className="reader__scroll" ref={scrollRef} onScroll={onScroll}>
        <article className="reader__page">
          <h1>{book.title}</h1>
          {book.author && <p className="reader__author">{book.author}</p>}
          {status === "loading" && <p className="reader__note">Loading the full text…</p>}
          {status === "error" && (
            <p className="reader__note">Couldn't load the text; showing a placeholder.</p>
          )}
          {!text && status === "idle" && (
            <p className="reader__note">
              Placeholder text — run <code>npm run fetch:content</code> for the full work (§7.2).
            </p>
          )}
          {paragraphs.slice(0, visible).map((para, i) => (
            <p key={i}>{para}</p>
          ))}
          {visible < paragraphs.length && (
            <button className="reader__more" onClick={() => setVisible((v) => v + CHUNK)}>
              Continue reading · {paragraphs.length - visible} more
            </button>
          )}
          <Attribution source={book.source} />
        </article>
      </div>
    </div>
  );
}
