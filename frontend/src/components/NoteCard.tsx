"use client";

import { Check, CircleCheck, Clock, Sparkles, X } from "lucide-react";

import type { Note } from "@/lib/types";
import { avatarPalette, formatDueDate, formatNoteTime, initials, isDueSoon } from "@/lib/format";

type Props = {
  note: Note;
  onOpen: (note: Note) => void;
  currentUserId?: string;
  onAccept?: (note: Note) => void;
  onReject?: (note: Note) => void;
};

export function NoteCard({ note, onOpen, currentUserId, onAccept, onReject }: Props) {
  const done = note.status === "done";
  const urgent = isDueSoon(note.due_at, note.status);
  const proposed = note.lifecycle === "proposed";
  const canModerate =
    proposed && !!currentUserId && note.author.id !== currentUserId && (!!onAccept || !!onReject);
  const avatar = avatarPalette(note.author.display_name);

  return (
    <div
      role="button"
      tabIndex={0}
      className={[
        "w-full cursor-pointer rounded-card border p-3.5 text-left shadow-soft transition hover:-translate-y-px hover:shadow-card",
        proposed
          ? "border-[#f0dfb2] bg-[#fdf6e0]/90"
          : "border-line bg-white/80 hover:border-accent/25",
        done ? "opacity-75" : "",
        urgent && !proposed ? "border-amber-300/70 bg-[#fff9eb]/90" : "",
      ].join(" ")}
      onClick={() => onOpen(note)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onOpen(note);
        }
      }}
    >
      <div className="mb-2 flex items-start gap-2.5">
        <div
          className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-[0.8rem] font-bold"
          style={{ background: avatar.bg, color: avatar.fg }}
          aria-hidden
        >
          {initials(note.author.display_name)}
        </div>
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <strong className="truncate text-[0.95rem] font-semibold text-ink">
            {note.author.display_name}
          </strong>
          <time dateTime={note.created_at} className="text-[0.78rem] text-muted">
            {formatNoteTime(note.created_at)}
          </time>
        </div>
        {proposed ? (
          <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-[#f7e9c4] px-2.5 py-1 text-[0.75rem] font-semibold text-[#8a6b1f]">
            <Sparkles size={13} aria-hidden />
            Идея
          </span>
        ) : done ? (
          <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-done-soft px-2.5 py-1 text-[0.75rem] font-semibold text-done">
            <CircleCheck size={13} aria-hidden />
            Сделали!
          </span>
        ) : (
          <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-accent-soft px-2.5 py-1 text-[0.75rem] font-semibold text-accent-deep">
            <Check size={13} aria-hidden />
            Берём!
          </span>
        )}
      </div>
      <p
        className={`m-0 whitespace-pre-wrap text-[0.95rem] leading-snug ${
          done ? "text-ink-soft" : "text-ink"
        }`}
        style={{
          display: "-webkit-box",
          WebkitLineClamp: 2,
          WebkitBoxOrient: "vertical",
          overflow: "hidden",
        }}
      >
        {note.text}
      </p>
      {!proposed && note.due_at && (
        <div
          className={[
            "mt-2.5 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[0.8rem] font-semibold",
            urgent ? "bg-amber-100 text-amber-900" : "bg-white/70 text-muted",
          ].join(" ")}
        >
          <Clock size={13} aria-hidden />
          <span>до {formatDueDate(note.due_at)}</span>
        </div>
      )}
      {canModerate && (
        <div className="mt-3 flex gap-1.5">
          {onAccept && (
            <button
              type="button"
              className="btn btn--primary flex-1 px-2 text-[0.88rem]"
              onClick={(e) => {
                e.stopPropagation();
                onAccept(note);
              }}
            >
              <Check size={16} aria-hidden />
              Берём!
            </button>
          )}
          {onReject && (
            <button
              type="button"
              className="btn flex-1 px-2 text-[0.88rem] text-muted"
              onClick={(e) => {
                e.stopPropagation();
                onReject(note);
              }}
            >
              <X size={16} aria-hidden />
              В другой раз
            </button>
          )}
        </div>
      )}
    </div>
  );
}
