import { useEffect, useMemo, useRef, useState } from "react";
import type { BookRef } from "../../model/types";
import { useMuseumStore } from "../../state/store";
import { Attribution } from "./Attribution";
import { loremChapters } from "./loremText";

/** Clean typographic reader for a book's text (§7.2). Scroll position is kept
 *  in session state so reopening a book returns you to where you were. */
export function Reader({ book, onClose }: { book: BookRef; onClose: () => void }) {
  const [dark, setDark] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);
  const setReadingPosition = useMuseumStore((s) => s.setReadingPosition);
  const sourceUrl = book.readUrl ?? book.externalUrl;
  const paragraphs = useMemo(() => loremChapters(book.id), [book.id]);

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = useMuseumStore.getState().readingPositions[book.id] ?? 0;
  }, [book.id]);

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
          {sourceUrl && (
            <a href={sourceUrl} target="_blank" rel="noopener noreferrer">
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
          <p className="reader__note">
            Placeholder text — the complete work streams from the source in Phase 4 (§7.2).
          </p>
          {paragraphs.map((para, i) => (
            <p key={i}>{para}</p>
          ))}
          <Attribution source={book.source} />
        </article>
      </div>
    </div>
  );
}
