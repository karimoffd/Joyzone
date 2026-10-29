import React, { useEffect } from "react";
import { createPortal } from "react-dom";
import "./videoModal.css";

// YouTube / Vimeo links become embeds; anything else is played as a file.
export function toVideoEmbed(url) {
  const value = String(url || "").trim();
  if (!value) return null;
  const youtube = value.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?(?:.*&)?v=|shorts\/|embed\/|live\/))([\w-]{6,})/i);
  if (youtube) return { kind: "iframe", src: `https://www.youtube-nocookie.com/embed/${youtube[1]}?autoplay=1&rel=0` };
  const vimeo = value.match(/vimeo\.com\/(?:video\/)?(\d+)/i);
  if (vimeo) return { kind: "iframe", src: `https://player.vimeo.com/video/${vimeo[1]}?autoplay=1` };
  return { kind: "file", src: value };
}

export function VideoModal({ url, title, onClose }) {
  const embed = toVideoEmbed(url);

  useEffect(() => {
    const onKey = (event) => { if (event.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  if (!embed) return null;

  return createPortal(
    <div className="vmodal" role="dialog" aria-modal="true" aria-label={title} onClick={onClose}>
      <div className="vmodal-box" onClick={(event) => event.stopPropagation()}>
        <div className="vmodal-head">
          <strong>{title}</strong>
          <button type="button" className="vmodal-close" onClick={onClose} aria-label="Yopish">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"><path d="M6 6l12 12M18 6 6 18" /></svg>
          </button>
        </div>
        <div className="vmodal-frame">
          {embed.kind === "iframe" ? (
            <iframe src={embed.src} title={title} allow="autoplay; encrypted-media; fullscreen; picture-in-picture" allowFullScreen />
          ) : (
            <video src={embed.src} controls autoPlay playsInline />
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}
