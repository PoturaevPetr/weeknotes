"use client";

import dynamic from "next/dynamic";
import { useMemo, useState, type MouseEvent } from "react";
import { format, setHours, setMinutes, startOfDay } from "date-fns";
import { ru } from "date-fns/locale";

import "react-day-picker/style.css";

type Props = {
  value: string | null;
  onChange: (iso: string | null) => void;
  disabled?: boolean;
};

const TIME_OPTIONS = ["09:00", "10:00", "12:00", "14:00", "16:00", "18:00", "20:00", "21:00"] as const;

const DayPickerLazy = dynamic(
  () => import("react-day-picker").then((m) => m.DayPicker),
  {
    ssr: false,
    loading: () => <p className="py-4 text-center text-sm text-muted">Календарь…</p>,
  },
);

function withTime(day: Date, hours: number, minutes: number): Date {
  return setMinutes(setHours(startOfDay(day), hours), minutes);
}

function parseValue(iso: string | null): Date | null {
  if (!iso) return null;
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? null : d;
}

function timeKey(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function DueDatePicker({ value, onChange, disabled }: Props) {
  const [open, setOpen] = useState(false);
  const [bodyReady, setBodyReady] = useState(false);
  const selected = useMemo(() => parseValue(value), [value]);
  const activeTime = selected ? timeKey(selected) : "18:00";

  const timeOptions = useMemo(() => {
    if (TIME_OPTIONS.includes(activeTime as (typeof TIME_OPTIONS)[number])) {
      return [...TIME_OPTIONS];
    }
    return [...TIME_OPTIONS, activeTime].sort();
  }, [activeTime]);

  function toggle() {
    if (disabled) return;
    setOpen((prev) => {
      const next = !prev;
      if (next) setBodyReady(true);
      return next;
    });
  }

  function applyDate(day: Date) {
    const [h, m] = activeTime.split(":").map(Number);
    onChange(withTime(day, h, m).toISOString());
  }

  function onTimeChange(hhmm: string) {
    const [h, m] = hhmm.split(":").map(Number);
    const base = selected ?? startOfDay(new Date());
    onChange(withTime(base, h, m).toISOString());
  }

  function clearDue(e: MouseEvent) {
    e.stopPropagation();
    onChange(null);
  }

  return (
    <div
      className={[
        "w-full min-w-0 overflow-hidden rounded-panel border border-line bg-white/55",
        open ? "is-open" : "",
        disabled ? "pointer-events-none opacity-60" : "",
      ].join(" ")}
    >
      <button
        type="button"
        className="grid min-h-tap w-full min-w-0 grid-cols-[minmax(0,1fr)_auto] items-center gap-2 border-0 bg-transparent px-3 py-2.5 text-left font-inherit text-ink hover:bg-accent-soft/50 sm:gap-2.5 sm:px-3.5"
        disabled={disabled}
        aria-expanded={open}
        onClick={toggle}
      >
        <span className="flex min-w-0 items-center gap-2">
          <span className="shrink-0 font-semibold text-ink">Указать время</span>
          {selected ? (
            <span className="min-w-0 truncate rounded-full bg-accent-soft px-2 py-0.5 text-[0.8rem] font-semibold text-accent-deep sm:text-[0.86rem]">
              {format(selected, "d MMM, HH:mm", { locale: ru })}
            </span>
          ) : (
            <span className="truncate text-[0.84rem] text-muted">не задано</span>
          )}
        </span>
        <span
          className={`shrink-0 text-[0.85rem] leading-none text-muted transition-transform duration-200 ${
            open ? "rotate-180" : ""
          }`}
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
        <div className="min-h-0 min-w-0 overflow-hidden">
          {bodyReady && (
            <div className="grid min-w-0 justify-items-center gap-2.5 border-t border-line px-2 py-3 sm:gap-3 sm:px-3 sm:py-3.5">
              <div className="mx-auto w-full max-w-full overflow-x-auto overflow-y-hidden rounded-card border border-line bg-white/80 p-1.5 shadow-soft sm:w-fit sm:p-2">
                <DayPickerLazy
                  mode="single"
                  locale={ru}
                  weekStartsOn={1}
                  selected={selected ?? undefined}
                  onSelect={(day) => {
                    if (!day) return;
                    applyDate(day);
                  }}
                  disabled={disabled ? true : { before: startOfDay(new Date()) }}
                  startMonth={startOfDay(new Date())}
                  className="due-rdp mx-auto text-[0.82rem] sm:text-[0.9rem] [--rdp-accent-background-color:var(--accent-soft)] [--rdp-accent-color:var(--accent)] [--rdp-day-height:1.95rem] [--rdp-day-width:1.95rem] [--rdp-day_button-border-radius:10px] [--rdp-day_button-height:1.85rem] [--rdp-day_button-width:1.85rem] [--rdp-nav-height:1.85rem] sm:[--rdp-day-height:2.2rem] sm:[--rdp-day-width:2.2rem] sm:[--rdp-day_button-height:2.1rem] sm:[--rdp-day_button-width:2.1rem] sm:[--rdp-nav-height:2rem]"
                />
              </div>

              <div className="grid w-full min-w-0 max-w-[20rem] gap-1.5" role="group" aria-label="Время">
                <span className="text-center text-[0.82rem] text-muted">Время</span>
                <div className="flex flex-wrap justify-center gap-1.5">
                  {timeOptions.map((t) => {
                    const active = activeTime === t && !!selected;
                    return (
                      <button
                        key={t}
                        type="button"
                        className={[
                          "min-w-[3.25rem] cursor-pointer rounded-full border px-2 py-1.5 text-[0.82rem] font-semibold transition sm:min-w-[3.6rem] sm:px-2.5 sm:text-[0.86rem]",
                          active
                            ? "border-transparent bg-accent text-white shadow-accent"
                            : "border-line bg-white/80 text-ink-soft hover:-translate-y-px hover:border-accent/35 hover:bg-accent-soft",
                        ].join(" ")}
                        disabled={disabled}
                        tabIndex={open ? 0 : -1}
                        onClick={() => onTimeChange(t)}
                      >
                        {t}
                      </button>
                    );
                  })}
                </div>
              </div>

              {selected && (
                <div className="flex w-full min-w-0 flex-col items-center gap-1.5 px-1">
                  <p className="m-0 max-w-full text-center text-[0.88rem] text-muted">
                    Срок:{" "}
                    <strong className="font-semibold text-ink">
                      {format(selected, "d MMM yyyy, HH:mm", { locale: ru })}
                    </strong>
                  </p>
                  <button
                    type="button"
                    className="border-0 bg-transparent p-1 font-semibold text-accent-deep underline underline-offset-2"
                    disabled={disabled}
                    tabIndex={open ? 0 : -1}
                    onClick={clearDue}
                  >
                    сбросить
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
