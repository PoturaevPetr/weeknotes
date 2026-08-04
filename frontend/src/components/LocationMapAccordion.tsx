"use client";

import dynamic from "next/dynamic";
import { useState } from "react";

type Props = {
  latitude: number;
  longitude: number;
};

const NoteLocationMap = dynamic(() => import("@/components/NoteLocationMap"), {
  ssr: false,
  loading: () => <p className="py-3 text-center text-sm text-muted">Карта…</p>,
});

export function LocationMapAccordion({ latitude, longitude }: Props) {
  const [open, setOpen] = useState(false);
  const [bodyReady, setBodyReady] = useState(false);

  function toggle() {
    setOpen((prev) => {
      const next = !prev;
      if (next) setBodyReady(true);
      return next;
    });
  }

  return (
    <div className="w-full overflow-hidden rounded-panel border border-line bg-white/55">
      <button
        type="button"
        className="grid min-h-tap w-full grid-cols-[1fr_auto_auto] items-center gap-2.5 border-0 bg-transparent px-3.5 py-2.5 text-left hover:bg-accent-soft/50"
        aria-expanded={open}
        onClick={toggle}
      >
        <span className="font-semibold text-ink">Геометка</span>
        <span className="whitespace-nowrap rounded-full bg-accent-soft px-2.5 py-0.5 text-[0.86rem] font-semibold text-accent-deep">
          {latitude.toFixed(4)}, {longitude.toFixed(4)}
        </span>
        <span
          className={`text-[0.85rem] text-muted transition-transform duration-200 ${open ? "rotate-180" : ""}`}
          aria-hidden
        >
          ▾
        </span>
      </button>
      <div
        className="grid transition-[grid-template-rows] duration-300 ease-out"
        style={{ gridTemplateRows: open ? "1fr" : "0fr" }}
        aria-hidden={!open}
      >
        <div className={`min-h-0 overflow-hidden ${open ? "border-t border-line" : ""}`}>
          {bodyReady && (
            <div className="p-3">
              <NoteLocationMap latitude={latitude} longitude={longitude} active={open} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
