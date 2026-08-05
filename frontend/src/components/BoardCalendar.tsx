"use client";

import { useEffect, useMemo, useState } from "react";
import { DayPicker } from "react-day-picker";
import { format, startOfMonth, endOfMonth, addMonths, startOfDay } from "date-fns";
import { ru } from "date-fns/locale";

import "react-day-picker/style.css";

import { api } from "@/lib/api";
import { mediaSrc } from "@/lib/media";
import type { CalendarDay } from "@/lib/types";

type Props = {
  boardId: string;
  token: string;
  onSelectDay: (dayKey: string) => void;
};

export function BoardCalendar({ boardId, token, onSelectDay }: Props) {
  const [month, setMonth] = useState(() => startOfMonth(new Date()));
  const [days, setDays] = useState<CalendarDay[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const range = useMemo(() => {
    const from = format(startOfMonth(addMonths(month, -1)), "yyyy-MM-dd");
    const to = format(endOfMonth(addMonths(month, 1)), "yyyy-MM-dd");
    return { from, to };
  }, [month]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    api
      .getCalendar(token, boardId, range.from, range.to)
      .then((res) => {
        if (!cancelled) setDays(res.days);
      })
      .catch(() => {
        if (!cancelled) setError("Не получилось загрузить календарь — попробуйте ещё раз");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [token, boardId, range.from, range.to]);

  const byDate = useMemo(() => {
    const map = new Map<string, CalendarDay>();
    for (const d of days) map.set(d.date, d);
    return map;
  }, [days]);

  return (
    <div className="rounded-card border border-line bg-panel p-3 shadow-soft backdrop-blur-md sm:p-4">
      <h2 className="m-0 mb-1 font-sans text-[1.05rem] font-semibold tracking-tight text-ink">
        Календарь
      </h2>
      <p className="mb-3 text-[0.9rem] leading-snug text-muted">
        Даты с заметками, сроками и выполненными задачами
      </p>

      {error && (
        <p className="mb-3 rounded-panel border border-[rgba(192,57,43,0.18)] bg-danger-soft px-3 py-2.5 text-[0.9rem] text-danger">
          {error}
        </p>
      )}

      <div className="mx-auto w-full max-w-full overflow-x-auto">
        <DayPicker
          mode="single"
          locale={ru}
          weekStartsOn={1}
          month={month}
          onMonthChange={(m) => setMonth(startOfMonth(m))}
          onSelect={(day) => {
            if (!day) return;
            const key = format(day, "yyyy-MM-dd");
            if (byDate.has(key)) onSelectDay(key);
          }}
          disabled={loading ? true : undefined}
          className="due-rdp mx-auto text-[0.9rem] [--rdp-accent-background-color:var(--accent-soft)] [--rdp-accent-color:var(--accent)] [--rdp-day-height:2.75rem] [--rdp-day-width:2.75rem] [--rdp-day_button-border-radius:999px] [--rdp-day_button-height:2.55rem] [--rdp-day_button-width:2.55rem] [--rdp-nav-height:2rem]"
          components={{
            DayButton: (props) => {
              const { day, ...buttonProps } = props;
              const key = format(day.date, "yyyy-MM-dd");
              const info = byDate.get(key);
              const isToday =
                format(startOfDay(new Date()), "yyyy-MM-dd") === key;
              const coverSrc =
                info?.cover != null
                  ? mediaSrc(info.cover.mime_type, info.cover.data_base64)
                  : null;

              return (
                <button
                  {...buttonProps}
                  type="button"
                  className={[
                    "relative grid h-[2.55rem] w-[2.55rem] place-items-center rounded-full border-0 p-0 text-[0.85rem] font-semibold transition",
                    info
                      ? "cursor-pointer text-white shadow-soft"
                      : "cursor-default bg-transparent text-ink-soft",
                    !info && isToday ? "text-accent-deep ring-1 ring-accent/35" : "",
                    buttonProps.disabled ? "opacity-40" : "",
                  ].join(" ")}
                  style={
                    info
                      ? coverSrc
                        ? {
                            backgroundImage: `linear-gradient(rgba(54,39,32,0.45), rgba(54,39,32,0.45)), url(${coverSrc})`,
                            backgroundSize: "cover",
                            backgroundPosition: "center",
                          }
                        : {
                            background: "var(--accent)",
                          }
                      : undefined
                  }
                  aria-label={
                    info
                      ? `${format(day.date, "d MMMM", { locale: ru })} — ${info.count}`
                      : format(day.date, "d MMMM", { locale: ru })
                  }
                >
                  <span className="relative z-[1] leading-none">{format(day.date, "d")}</span>
                  {info && info.count > 0 && (
                    <span
                      className={[
                        "absolute -bottom-0.5 left-1/2 z-[1] -translate-x-1/2 rounded-full px-1 text-[0.62rem] font-bold leading-tight",
                        coverSrc
                          ? "bg-white/90 text-ink"
                          : "bg-white/25 text-white",
                      ].join(" ")}
                    >
                      {info.count}
                    </span>
                  )}
                </button>
              );
            },
          }}
        />
      </div>
      {loading && <p className="mt-2 text-center text-sm text-muted">Загрузка…</p>}
    </div>
  );
}
