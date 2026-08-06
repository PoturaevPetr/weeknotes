"use client";

import { FormEvent, KeyboardEvent, useEffect, useRef } from "react";
import { Send, X } from "lucide-react";

const MAX_COMMENT_LENGTH = 2000;
/** Input grows with the text up to roughly five lines, then scrolls. */
const MAX_INPUT_HEIGHT = 140;

type Props = {
  draft: string;
  sending: boolean;
  sendError: string | null;
  onDraftChange: (text: string) => void;
  onSubmit: () => void;
  onClose: () => void;
};

export function NoteCommentComposer({
  draft,
  sending,
  sendError,
  onDraftChange,
  onSubmit,
  onClose,
}: Props) {
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    const input = inputRef.current;
    if (!input) return;
    input.style.height = "auto";
    input.style.height = `${Math.min(input.scrollHeight, MAX_INPUT_HEIGHT)}px`;
  }, [draft]);

  function submit(e: FormEvent) {
    e.preventDefault();
    onSubmit();
  }

  function onKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      onSubmit();
    }
  }

  return (
    <form onSubmit={submit}>
      {sendError && (
        <p className="mb-2 mt-0 rounded-panel border border-[rgba(192,57,43,0.18)] bg-danger-soft px-3 py-2 text-[0.88rem] text-danger">
          {sendError}
        </p>
      )}
      <div className="flex items-end gap-1.5">
        <button
          type="button"
          className="grid h-[2.6rem] w-[2.6rem] shrink-0 cursor-pointer place-items-center rounded-full border border-line bg-white text-muted transition hover:text-ink active:scale-95"
          onClick={onClose}
          aria-label="Скрыть поле комментария"
        >
          <X size={17} aria-hidden />
        </button>
        <div className="relative min-w-0 flex-1 rounded-[1.5rem] border border-[rgba(84,56,41,0.2)] bg-paper transition-[border-color,box-shadow] duration-150 focus-within:border-[rgba(232,102,63,0.55)] focus-within:shadow-[0_0_0_4px_rgba(232,102,63,0.12)]">
          {/* Right padding keeps every line of text clear of the button in the corner. */}
          <textarea
            ref={inputRef}
            value={draft}
            onChange={(e) => onDraftChange(e.target.value)}
            onKeyDown={onKeyDown}
            rows={1}
            maxLength={MAX_COMMENT_LENGTH}
            placeholder="Написать комментарий…"
            className="block min-h-[2.6rem] w-full resize-none overflow-y-auto border-0 bg-transparent py-[0.6rem] pl-4 pr-[2.9rem] leading-snug shadow-none focus:border-0 focus:shadow-none"
            disabled={sending}
          />
          <button
            type="submit"
            className="absolute bottom-[0.25rem] right-[0.25rem] grid h-[2.1rem] w-[2.1rem] cursor-pointer place-items-center rounded-full border-0 bg-accent text-white transition hover:bg-accent-deep active:scale-95 disabled:cursor-not-allowed disabled:bg-accent-soft disabled:text-muted"
            disabled={sending || !draft.trim()}
            aria-label="Отправить комментарий"
          >
            <Send size={16} aria-hidden />
          </button>
        </div>
      </div>
    </form>
  );
}
