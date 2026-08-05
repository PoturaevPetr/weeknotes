"use client";

import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";

type ModalProps = {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  /** Fixed ~66vh sheet (note detail). Default: height fits content. */
  tall?: boolean;
};

const ANIM_MS = 280;

export function Modal({ open, onClose, title, children, tall = false }: ModalProps) {
  const titleId = useId();
  const [mounted, setMounted] = useState(false);
  const [visible, setVisible] = useState(false);
  const closingRef = useRef(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;
    closingRef.current = false;
    const id = requestAnimationFrame(() => setVisible(true));
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      cancelAnimationFrame(id);
      document.body.style.overflow = prev;
    };
  }, [open]);

  const requestClose = useCallback(() => {
    if (closingRef.current) return;
    closingRef.current = true;
    setVisible(false);
    window.setTimeout(() => {
      onClose();
      closingRef.current = false;
    }, ANIM_MS);
  }, [onClose]);

  useEffect(() => {
    if (!open) {
      setVisible(false);
      return;
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") requestClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, requestClose]);

  if (!mounted || !open) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-end justify-center md:items-center md:p-6"
      role="presentation"
    >
      <button
        type="button"
        className={`absolute inset-0 border-0 bg-[rgba(54,39,32,0.28)] backdrop-blur-md transition-opacity duration-[280ms] ${
          visible ? "opacity-100" : "opacity-0"
        }`}
        aria-label="Закрыть"
        onClick={requestClose}
      />
      <div
        className={[
          "relative z-[1] flex w-full min-w-0 max-w-full flex-col overflow-hidden border border-line border-b-0 bg-white shadow-[0_-8px_40px_rgba(54,39,32,0.12)]",
          "rounded-t-[22px] px-3.5 pb-[calc(1rem+var(--safe-bottom))] pt-1.5 sm:px-4",
          "max-h-[min(92dvh,100%)] translate-y-[110%] transition-transform duration-[280ms] ease-[cubic-bezier(0.22,1,0.36,1)]",
          "md:max-h-[min(85dvh,720px)] md:translate-y-4 md:scale-[0.98] md:rounded-[22px] md:border md:px-5 md:pb-5 md:opacity-0 md:shadow-card md:transition-[transform,opacity] md:duration-[280ms]",
          tall
            ? "h-[66dvh] max-h-[66dvh] md:h-[min(66dvh,640px)] md:max-h-[min(66dvh,640px)] md:w-full md:max-w-modal-tall"
            : "md:w-full md:max-w-modal",
          visible ? "!translate-y-0 md:!translate-y-0 md:!scale-100 md:!opacity-100" : "",
        ].join(" ")}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
      >
        <div
          className="mx-auto mb-2 mt-1.5 h-[0.28rem] w-10 shrink-0 rounded-full bg-ink/15 md:hidden"
          aria-hidden
        />
        <header className="mb-2.5 flex shrink-0 items-center justify-between gap-3">
          <h2
            id={titleId}
            className="m-0 min-w-0 truncate font-display text-[1.15rem] font-medium tracking-[-0.02em] text-ink"
          >
            {title}
          </h2>
          <button
            type="button"
            className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-line bg-white text-xl leading-none text-ink-soft"
            aria-label="Закрыть"
            onClick={requestClose}
          >
            ×
          </button>
        </header>
        <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
          {children}
        </div>
      </div>
    </div>,
    document.body,
  );
}
