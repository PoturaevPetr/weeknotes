"use client";

import type { Note } from "@/lib/types";
import { formatDueDate, formatNoteTime, initials, isDueSoon } from "@/lib/format";

type Props = {
  note: Note;
  onOpen: (note: Note) => void;
};

export function NoteCard({ note, onOpen }: Props) {
  const done = note.status === "done";
  const urgent = isDueSoon(note.due_at, note.status);
  const hasMedia = (note.attachments?.length ?? 0) > 0;

  return (
    <button
      type="button"
      className={[
        "w-full rounded-card border border-line bg-white/80 p-3.5 text-left shadow-soft transition hover:-translate-y-px hover:border-accent/25 hover:shadow-card",
        done ? "opacity-75" : "",
        urgent ? "border-amber-300/70 bg-[#fff9eb]/90" : "",
      ].join(" ")}
      onClick={() => onOpen(note)}
    >
      <div className="mb-2.5 flex items-start gap-2.5">
        <div
          className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-accent-soft text-[0.8rem] font-bold text-accent-deep"
          aria-hidden
        >
          {initials(note.author.display_name)}
        </div>
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <strong className="truncate text-[0.95rem] font-semibold text-ink">
            {note.author.display_name}
          </strong>
          <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[0.78rem] text-muted">
            <time dateTime={note.created_at}>{formatNoteTime(note.created_at)}</time>
            {note.latitude != null && note.longitude != null && <span>📍</span>}
            {hasMedia && <span title="Есть вложения">📎</span>}
            {done && <span>выполнено</span>}
            <span>
              {note.liked_by_me ? "♥" : "♡"} {note.likes_count}
            </span>
          </div>
        </div>
      </div>
      <p
        className={`m-0 whitespace-pre-wrap text-[0.95rem] leading-snug text-ink ${
          done ? "text-ink-soft" : ""
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
      {note.due_at && (
        <div
          className={[
            "mt-2.5 inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[0.8rem] font-semibold",
            urgent
              ? "bg-amber-100 text-amber-900"
              : "bg-white/70 text-muted",
          ].join(" ")}
        >
          {urgent && <span aria-hidden>⏳</span>}
          <span>до {formatDueDate(note.due_at)}</span>
        </div>
      )}
    </button>
  );
}
