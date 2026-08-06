"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp, Heart, MessageCircle, Trash2 } from "lucide-react";

import { avatarPalette, formatCommentsCount, formatNoteTime, initials } from "@/lib/format";
import type { Comment } from "@/lib/types";

/** Newest few stay visible; older ones hide behind the toggle. */
const COLLAPSED_COUNT = 3;

type Props = {
  comments: Comment[];
  loaded: boolean;
  loadError: string | null;
  actionError: string | null;
  currentUserId: string;
  onToggleLike: (comment: Comment) => void;
  onRemove: (comment: Comment) => void;
};

export function NoteCommentsList({
  comments,
  loaded,
  loadError,
  actionError,
  currentUserId,
  onToggleLike,
  onRemove,
}: Props) {
  const [expanded, setExpanded] = useState(false);
  const hidden = Math.max(0, comments.length - COLLAPSED_COUNT);
  const visible = expanded || hidden === 0 ? comments : comments.slice(-COLLAPSED_COUNT);

  return (
    <section className="mt-4 border-t border-line pt-3.5">
      <h3 className="m-0 mb-2.5 flex items-center gap-1.5 text-[0.88rem] font-semibold text-muted">
        <MessageCircle size={15} aria-hidden />
        {loaded || comments.length > 0 ? formatCommentsCount(comments.length) : "Комментарии"}
      </h3>

      {loadError && <p className="m-0 mb-2 text-[0.9rem] text-muted">{loadError}</p>}

      {loaded && !loadError && comments.length === 0 && (
        <p className="m-0 text-[0.88rem] leading-snug text-muted">
          Добавьте первый через меню внизу справа
        </p>
      )}

      {hidden > 0 && (
        <button
          type="button"
          className="mb-2.5 inline-flex cursor-pointer items-center gap-1 rounded-full border-0 bg-transparent p-0 text-[0.85rem] font-semibold text-accent-deep transition hover:underline"
          onClick={() => setExpanded((open) => !open)}
          aria-expanded={expanded}
        >
          {expanded ? (
            <>
              <ChevronUp size={14} aria-hidden />
              Свернуть
            </>
          ) : (
            <>
              <ChevronDown size={14} aria-hidden />
              Посмотреть все
            </>
          )}
        </button>
      )}

      {visible.length > 0 && (
        <div className="grid gap-2.5">
          {visible.map((comment) => {
            const palette = avatarPalette(comment.author.display_name);
            const mine = comment.author.id === currentUserId;
            return (
              <article key={comment.id} className="flex gap-2">
                <div
                  className="grid h-7 w-7 shrink-0 place-items-center rounded-full text-[0.7rem] font-bold"
                  style={{ background: palette.bg, color: palette.fg }}
                  aria-hidden
                >
                  {initials(comment.author.display_name)}
                </div>
                <div className="min-w-0 flex-1 rounded-panel border border-line bg-white/70 px-3 py-2">
                  <div className="mb-0.5 flex items-baseline gap-2">
                    <strong className="min-w-0 truncate text-[0.86rem] font-semibold text-ink">
                      {comment.author.display_name}
                    </strong>
                    <time
                      dateTime={comment.created_at}
                      className="ml-auto shrink-0 text-[0.74rem] text-muted"
                    >
                      {formatNoteTime(comment.created_at)}
                    </time>
                  </div>
                  <p className="m-0 whitespace-pre-wrap break-words text-[0.95rem] leading-snug text-ink">
                    {comment.text}
                  </p>
                  <div className="mt-1 flex items-center gap-0.5">
                    <button
                      type="button"
                      className={`inline-flex min-h-[1.85rem] cursor-pointer items-center gap-1 rounded-full border px-2 text-[0.76rem] font-semibold transition ${
                        comment.liked_by_me
                          ? "border-[rgba(226,85,123,0.25)] bg-liked-soft text-liked"
                          : "border-transparent bg-transparent text-muted hover:bg-white"
                      }`}
                      onClick={() => onToggleLike(comment)}
                      aria-pressed={comment.liked_by_me}
                    >
                      <Heart
                        size={13}
                        aria-hidden
                        fill={comment.liked_by_me ? "currentColor" : "none"}
                      />
                      {comment.likes_count > 0 ? comment.likes_count : "Нравится"}
                    </button>
                    {mine && (
                      <button
                        type="button"
                        className="inline-flex min-h-[1.85rem] cursor-pointer items-center rounded-full border border-transparent bg-transparent px-2 text-muted transition hover:bg-danger-soft hover:text-danger"
                        onClick={() => onRemove(comment)}
                        aria-label="Удалить комментарий"
                      >
                        <Trash2 size={13} aria-hidden />
                      </button>
                    )}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {actionError && (
        <p className="mb-0 mt-2 rounded-panel border border-[rgba(192,57,43,0.18)] bg-danger-soft px-3 py-2 text-[0.88rem] text-danger">
          {actionError}
        </p>
      )}
    </section>
  );
}
