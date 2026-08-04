"use client";

import { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";

import { mediaSrc } from "@/lib/media";
import type { Attachment } from "@/lib/types";

type Props = {
  items: Attachment[];
  index: number;
  onClose: () => void;
  onIndexChange: (index: number) => void;
};

export function MediaLightbox({ items, index, onClose, onIndexChange }: Props) {
  const [mounted, setMounted] = useState(false);
  const item = items[index];
  const multi = items.length > 1;

  useEffect(() => {
    setMounted(true);
  }, []);

  const goPrev = useCallback(() => {
    if (!multi) return;
    onIndexChange((index - 1 + items.length) % items.length);
  }, [index, items.length, multi, onIndexChange]);

  const goNext = useCallback(() => {
    if (!multi) return;
    onIndexChange((index + 1) % items.length);
  }, [index, items.length, multi, onIndexChange]);

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft") goPrev();
      if (e.key === "ArrowRight") goNext();
    }
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [onClose, goPrev, goNext]);

  if (!mounted || !item) return null;

  const src = mediaSrc(item.mime_type, item.data_base64);

  return createPortal(
    <div
      className="fixed inset-0 z-[120] flex flex-col bg-[rgba(10,16,14,0.92)] animate-fade"
      style={{
        padding:
          "env(safe-area-inset-top, 0) env(safe-area-inset-right, 0) env(safe-area-inset-bottom, 0) env(safe-area-inset-left, 0)",
      }}
      role="dialog"
      aria-modal="true"
      aria-label={item.filename}
    >
      <button
        type="button"
        className="absolute inset-0 cursor-zoom-out border-0 bg-transparent"
        aria-label="Закрыть"
        onClick={onClose}
      />

      <div className="relative z-[2] flex items-center gap-3 px-4 py-3">
        <p className="m-0 min-w-0 flex-1 truncate text-[0.9rem] font-semibold text-white/90">
          {item.filename}
          {multi ? (
            <span className="font-medium text-white/55">
              {" "}
              · {index + 1}/{items.length}
            </span>
          ) : null}
        </p>
        <button
          type="button"
          className="grid h-10 w-10 shrink-0 place-items-center rounded-full border-0 bg-white/12 text-2xl leading-none text-white"
          aria-label="Закрыть"
          onClick={onClose}
        >
          ×
        </button>
      </div>

      <div className="relative z-[1] flex min-h-0 flex-1 items-center justify-center gap-1.5 px-2 pb-4">
        {multi && (
          <button
            type="button"
            className="absolute left-1.5 top-1/2 z-[3] grid h-10 w-10 -translate-y-1/2 place-items-center rounded-full border-0 bg-white/14 text-2xl leading-none text-white hover:bg-white/25 md:static md:translate-y-0"
            aria-label="Предыдущее"
            onClick={(e) => {
              e.stopPropagation();
              goPrev();
            }}
          >
            ‹
          </button>
        )}

        <div
          className="flex max-h-full max-w-[min(100%,960px)] items-center justify-center"
          onClick={(e) => e.stopPropagation()}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={src}
            alt={item.filename}
            className="h-auto max-h-[min(78dvh,900px)] w-auto max-w-full rounded-xl bg-black object-contain"
          />
        </div>

        {multi && (
          <button
            type="button"
            className="absolute right-1.5 top-1/2 z-[3] grid h-10 w-10 -translate-y-1/2 place-items-center rounded-full border-0 bg-white/14 text-2xl leading-none text-white hover:bg-white/25 md:static md:translate-y-0"
            aria-label="Следующее"
            onClick={(e) => {
              e.stopPropagation();
              goNext();
            }}
          >
            ›
          </button>
        )}
      </div>
    </div>,
    document.body,
  );
}
