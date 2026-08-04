"use client";

import dynamic from "next/dynamic";
import { useState } from "react";

import { explainGeoFailure, requestGeoCoords } from "@/lib/geolocation";

type Coords = { latitude: number; longitude: number };

type Props = {
  value: Coords | null;
  onChange: (coords: Coords | null) => void;
  disabled?: boolean;
};

const NoteLocationPicker = dynamic(() => import("@/components/NoteLocationPicker"), {
  ssr: false,
  loading: () => <p className="py-3 text-center text-sm text-muted">Карта…</p>,
});

export function EditLocationField({ value, onChange, disabled }: Props) {
  const [open, setOpen] = useState(false);
  const [bodyReady, setBodyReady] = useState(false);
  const [geoBusy, setGeoBusy] = useState(false);
  const [geoError, setGeoError] = useState<string | null>(null);

  function toggle() {
    if (disabled) return;
    setOpen((prev) => {
      const next = !prev;
      if (next) setBodyReady(true);
      return next;
    });
  }

  async function requestMyLocation() {
    setGeoError(null);
    setGeoBusy(true);
    setOpen(true);
    setBodyReady(true);
    try {
      onChange(await requestGeoCoords());
    } catch (err) {
      setGeoError(explainGeoFailure(err));
    } finally {
      setGeoBusy(false);
    }
  }

  return (
    <div
      className={[
        "w-full overflow-hidden rounded-panel border border-line bg-white/55",
        disabled ? "pointer-events-none opacity-60" : "",
      ].join(" ")}
    >
      <button
        type="button"
        className="grid min-h-tap w-full grid-cols-[1fr_auto_auto] items-center gap-2.5 border-0 bg-transparent px-3.5 py-2.5 text-left hover:bg-accent-soft/50"
        disabled={disabled}
        aria-expanded={open}
        onClick={toggle}
      >
        <span className="font-semibold text-ink">Геометка</span>
        {value ? (
          <span className="whitespace-nowrap rounded-full bg-accent-soft px-2.5 py-0.5 text-[0.86rem] font-semibold text-accent-deep">
            {value.latitude.toFixed(4)}, {value.longitude.toFixed(4)}
          </span>
        ) : (
          <span className="text-[0.84rem] text-muted">не задано</span>
        )}
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
            <div className="grid gap-2.5 p-3">
              <p className="m-0 text-center text-sm text-muted">
                {geoBusy ? "Определяем координаты…" : "Нажмите на карту, чтобы поставить метку"}
              </p>
              <NoteLocationPicker value={value} onChange={onChange} active={open} />
              <div className="note-form__geo-actions flex flex-wrap items-center gap-2.5">
                <button
                  type="button"
                  className="btn btn--soft"
                  disabled={disabled || geoBusy}
                  onClick={() => void requestMyLocation()}
                >
                  {geoBusy ? "Определяем…" : geoError ? "Повторить" : "Моя гео"}
                </button>
                {value && (
                  <button
                    type="button"
                    className="border-0 bg-transparent p-1 font-semibold text-accent-deep underline underline-offset-2"
                    disabled={disabled}
                    onClick={() => onChange(null)}
                  >
                    сбросить
                  </button>
                )}
              </div>
              {geoError && (
                <p className="m-0 rounded-panel border border-[rgba(192,57,43,0.18)] bg-danger-soft px-3.5 py-3 text-[0.92rem] text-danger">
                  {geoError}
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
