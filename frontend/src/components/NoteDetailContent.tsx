"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import {
  Check,
  Clock,
  Heart,
  MessageCircle,
  MoreHorizontal,
  Pencil,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";

import { AttachmentDropzone } from "@/components/AttachmentDropzone";
import { DueDatePicker } from "@/components/DueDatePicker";
import { EditLocationField } from "@/components/EditLocationField";
import { LocationMapAccordion } from "@/components/LocationMapAccordion";
import { MediaLightbox } from "@/components/MediaLightbox";
import { NoteCommentComposer } from "@/components/NoteCommentComposer";
import { NoteCommentsList } from "@/components/NoteCommentsList";
import { useNoteComments } from "@/hooks/useNoteComments";
import { api } from "@/lib/api";
import { clearCommentDraft } from "@/lib/commentDrafts";
import { avatarPalette, formatDueDate, formatNoteTime, initials, isDueSoon } from "@/lib/format";
import {
  MAX_ATTACHMENTS,
  mediaSrc,
  toAttachmentInputs,
  type DraftAttachment,
} from "@/lib/media";
import type { CommentEvent, Note, NoteDetail } from "@/lib/types";

type Props = {
  note: Note;
  token: string;
  currentUserId: string;
  onLike: (note: Note) => void;
  onToggleDone: (note: Note) => void;
  onDelete: (note: Note) => void;
  onUpdated: (note: Note) => void;
  onAccept?: (note: Note) => void;
  onReject?: (note: Note) => void;
  subscribeComments?: (listener: (event: CommentEvent) => void) => () => void;
  onCommentsCountChange?: (noteId: string, count: number) => void;
};

export function NoteDetailContent({
  note,
  token,
  currentUserId,
  onLike,
  onToggleDone,
  onDelete,
  onUpdated,
  onAccept,
  onReject,
  subscribeComments,
  onCommentsCountChange,
}: Props) {
  const [detail, setDetail] = useState<NoteDetail | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(note.text);
  const [dueAt, setDueAt] = useState<string | null>(note.due_at);
  const [editCoords, setEditCoords] = useState<{ latitude: number; longitude: number } | null>(
    note.latitude != null && note.longitude != null
      ? { latitude: note.latitude, longitude: note.longitude }
      : null,
  );
  const [newFiles, setNewFiles] = useState<DraftAttachment[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [composerOpen, setComposerOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const composerRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const comments = useNoteComments({
    noteId: note.id,
    token,
    subscribe: subscribeComments,
    onCountChange: onCommentsCountChange,
  });
  const hasDraft = comments.draft.trim().length > 0;

  useEffect(() => {
    if (!menuOpen) return;
    function onPointerDown(e: PointerEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    function onKey(e: KeyboardEvent) {
      if (e.key !== "Escape") return;
      // Close just the menu; the modal keeps its own Escape for the next press.
      e.stopPropagation();
      setMenuOpen(false);
    }
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKey, true);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKey, true);
    };
  }, [menuOpen]);

  useEffect(() => {
    if (!composerOpen) return;
    function onPointerDown(e: PointerEvent) {
      // An unfinished comment keeps the composer open wherever you click.
      if (hasDraft) return;
      if (composerRef.current && !composerRef.current.contains(e.target as Node)) {
        setComposerOpen(false);
      }
    }
    function onKey(e: KeyboardEvent) {
      if (e.key !== "Escape") return;
      // Capture phase, so the modal's own window listener does not also fire.
      e.stopPropagation();
      setComposerOpen(false);
    }
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKey, true);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKey, true);
    };
  }, [composerOpen, hasDraft]);

  useEffect(() => {
    let cancelled = false;
    setDetail(null);
    setLoadError(null);
    setEditing(false);
    setNewFiles([]);
    setError(null);
    setLightboxIndex(null);
    setMenuOpen(false);
    setComposerOpen(false);
    api
      .getNote(token, note.id)
      .then((d) => {
        if (!cancelled) {
          setDetail(d);
          setText(d.text);
          setDueAt(d.due_at);
          setEditCoords(
            d.latitude != null && d.longitude != null
              ? { latitude: d.latitude, longitude: d.longitude }
              : null,
          );
        }
      })
      .catch(() => {
        if (!cancelled) setLoadError("Не получилось загрузить фото");
      });
    return () => {
      cancelled = true;
    };
  }, [note.id, token]);

  useEffect(() => {
    setDetail((prev) =>
      prev && prev.id === note.id
        ? {
            ...prev,
            ...note,
            attachments: prev.attachments,
          }
        : prev,
    );
  }, [note]);

  const view = detail ?? note;
  const done = view.status === "done";
  const urgent = isDueSoon(view.due_at, view.status);
  const isAuthor = view.author.id === currentUserId;
  const isProposed = view.lifecycle === "proposed";
  const canEdit = isAuthor;
  const canDelete = isAuthor;
  const canModerate = isProposed && !isAuthor && (!!onAccept || !!onReject);
  const attachments = detail?.attachments ?? [];
  const slotsLeft = Math.max(0, MAX_ATTACHMENTS - attachments.length);

  function scrollCommentsToEnd() {
    // Wait for the new comment to land in the DOM, otherwise scrollHeight is stale.
    requestAnimationFrame(() => {
      const scroller = scrollRef.current;
      scroller?.scrollTo({ top: scroller.scrollHeight, behavior: "smooth" });
    });
  }

  async function sendComment() {
    if (await comments.submit()) scrollCommentsToEnd();
  }

  function deleteNote() {
    clearCommentDraft(note.id);
    onDelete(view);
  }

  async function removeExisting(attachmentId: string) {
    setBusy(true);
    setError(null);
    try {
      const updated = await api.deleteAttachment(token, note.id, attachmentId);
      onUpdated(updated);
      const fresh = await api.getNote(token, note.id);
      setDetail(fresh);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не получилось удалить фото — попробуйте ещё раз");
    } finally {
      setBusy(false);
    }
  }

  async function saveEdit(e: FormEvent) {
    e.preventDefault();
    if (!text.trim()) return;
    setBusy(true);
    setError(null);
    try {
      let updated = await api.updateNote(token, note.id, {
        text: text.trim(),
        due_at: dueAt,
        latitude: editCoords?.latitude ?? null,
        longitude: editCoords?.longitude ?? null,
      });
      if (newFiles.length) {
        const detailAfter = await api.addAttachments(
          token,
          note.id,
          toAttachmentInputs(newFiles),
        );
        updated = detailAfter;
        setDetail(detailAfter);
        setNewFiles([]);
      } else {
        const fresh = await api.getNote(token, note.id);
        setDetail(fresh);
      }
      onUpdated(updated);
      setEditing(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не получилось сохранить — попробуйте ещё раз");
    } finally {
      setBusy(false);
    }
  }

  function startEdit() {
    setText(view.text);
    setDueAt(view.due_at);
    setEditCoords(
      view.latitude != null && view.longitude != null
        ? { latitude: view.latitude, longitude: view.longitude }
        : null,
    );
    setNewFiles([]);
    setError(null);
    setEditing(true);
  }

  if (editing) {
    return (
      <form className="flex h-full min-h-0 flex-col overflow-x-hidden overflow-y-auto overscroll-contain [-webkit-overflow-scrolling:touch]" onSubmit={saveEdit}>
        <label className="mb-4 flex flex-col gap-1.5">
          <span className="text-[0.82rem] font-semibold tracking-wide text-muted">Текст</span>
          <textarea value={text} onChange={(e) => setText(e.target.value)} rows={5} required />
        </label>
        <div className="mb-4 flex flex-col gap-1.5">
          <span className="text-[0.82rem] font-semibold tracking-wide text-muted">Срок исполнения</span>
          <DueDatePicker value={dueAt} onChange={setDueAt} disabled={busy} />
        </div>

        <div className="mb-4 flex flex-col gap-1.5">
          <span className="text-[0.82rem] font-semibold tracking-wide text-muted">Место</span>
          <EditLocationField value={editCoords} onChange={setEditCoords} disabled={busy} />
        </div>

        <div className="mb-4 flex flex-col gap-1.5">
          <span className="text-[0.82rem] font-semibold tracking-wide text-muted">Текущие вложения</span>
          {attachments.length === 0 && <p className="m-0 text-[0.9rem] text-muted">Пока нет</p>}
          {attachments.length > 0 && (
            <div className="grid gap-3.5">
              {attachments.map((a) => (
                <div key={a.id} className="grid gap-1.5">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={mediaSrc(a.mime_type, a.data_base64)}
                    alt={a.filename}
                    className="block max-h-[220px] w-full rounded-panel border border-line bg-[#f2ebe1] object-cover"
                  />
                  <button
                    type="button"
                    className="btn btn--danger w-full"
                    disabled={busy}
                    onClick={() => void removeExisting(a.id)}
                  >
                    Удалить файл
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {slotsLeft > 0 && (
          <div className="mb-4 flex flex-col gap-1.5">
            <span className="text-[0.82rem] font-semibold tracking-wide text-muted">Добавить вложения</span>
            <AttachmentDropzone
              files={newFiles}
              onChange={setNewFiles}
              onError={setError}
              disabled={busy}
              maxFiles={slotsLeft}
            />
          </div>
        )}

        {error && (
          <p className="mb-3 rounded-panel border border-[rgba(192,57,43,0.18)] bg-danger-soft px-3.5 py-3 text-[0.92rem] text-danger">
            {error}
          </p>
        )}
        <div className="mt-2 flex justify-end gap-2">
          <button
            type="button"
            className="btn"
            disabled={busy}
            onClick={() => {
              setEditing(false);
              setNewFiles([]);
              setError(null);
            }}
          >
            Отмена
          </button>
          <button type="submit" className="btn btn--primary" disabled={busy || !text.trim()}>
            {busy ? "Сохраняем…" : "Сохранить"}
          </button>
        </div>
      </form>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div
        ref={scrollRef}
        className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto overscroll-contain [-webkit-overflow-scrolling:touch]"
      >
        <div className="mb-2.5 flex items-start gap-2.5">
          <div
            className="grid h-[2.1rem] w-[2.1rem] shrink-0 place-items-center rounded-full text-[0.8rem] font-bold"
            style={{
              background: avatarPalette(view.author.display_name).bg,
              color: avatarPalette(view.author.display_name).fg,
            }}
            aria-hidden
          >
            {initials(view.author.display_name)}
          </div>
          <div className="flex min-w-0 flex-1 flex-col gap-0.5">
            <strong className="text-[0.92rem] font-bold text-ink">{view.author.display_name}</strong>
            <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[0.8rem] text-muted">
              <time dateTime={view.created_at}>{formatNoteTime(view.created_at)}</time>
            </div>
          </div>
        </div>

        {isProposed && (
          <p className="mb-2 inline-flex items-center justify-center gap-1.5 self-center rounded-full bg-[#f7e9c4] px-3 py-1.5 text-center text-[0.82rem] font-semibold text-[#8a6b1f]">
            <Sparkles size={14} aria-hidden />
            Идея — решите вместе, берёте ли в планы
          </p>
        )}

        {view.due_at && (
          <div
            className={[
              "mb-2 inline-flex items-center gap-1 self-start rounded-full px-2.5 py-1 text-[0.82rem] font-semibold",
              urgent ? "bg-amber-100 text-amber-900" : "bg-white/70 text-muted",
            ].join(" ")}
          >
            <Clock size={13} aria-hidden />
            <span>до {formatDueDate(view.due_at)}</span>
          </div>
        )}

        <p className="m-0 whitespace-pre-wrap pb-4 text-[1.05rem] leading-relaxed text-ink">
          {view.text}
        </p>

        {view.latitude != null && view.longitude != null && (
          <div className="mb-1 mt-3">
            <LocationMapAccordion latitude={view.latitude} longitude={view.longitude} />
          </div>
        )}

        {loadError && <p className="m-0 text-[0.9rem] text-muted">{loadError}</p>}
        {!detail && (note.attachments?.length ?? 0) > 0 && !loadError && (
          <p className="m-0 text-[0.9rem] text-muted">Загружаем фото…</p>
        )}

        {attachments.length > 0 && (
          <div className="mb-2 grid gap-2.5">
            {attachments.map((a, i) => (
              <button
                key={a.id}
                type="button"
                className="relative block w-full cursor-zoom-in overflow-hidden rounded-panel border-0 bg-transparent p-0 text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                onClick={() => setLightboxIndex(i)}
                aria-label={`Открыть ${a.filename}`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={mediaSrc(a.mime_type, a.data_base64)}
                  alt={a.filename}
                  className="pointer-events-none block max-h-[220px] w-full rounded-panel border border-line bg-[#f2ebe1] object-cover"
                />
              </button>
            ))}
          </div>
        )}

        <NoteCommentsList
          key={note.id}
          comments={comments.comments}
          loaded={comments.loaded}
          loadError={comments.loadError}
          actionError={comments.actionError}
          currentUserId={currentUserId}
          onToggleLike={(comment) => void comments.toggleLike(comment)}
          onRemove={(comment) => void comments.remove(comment)}
        />
      </div>

      {lightboxIndex != null && attachments.length > 0 && (
        <MediaLightbox
          items={attachments}
          index={lightboxIndex}
          onClose={() => setLightboxIndex(null)}
          onIndexChange={setLightboxIndex}
        />
      )}

      <div className="mt-3 shrink-0 border-t border-line pt-3">
        {composerOpen ? (
          // Padding leaves room for the focus ring, which the modal clips otherwise.
          <div className="px-1.5 pb-1.5" ref={composerRef}>
            <NoteCommentComposer
              draft={comments.draft}
              sending={comments.sending}
              sendError={comments.sendError}
              onDraftChange={comments.setDraft}
              onSubmit={() => void sendComment()}
              onClose={() => setComposerOpen(false)}
            />
          </div>
        ) : (
          <div className="flex items-center gap-1.5">
            {canModerate && (
              <>
                <button
                  type="button"
                  className="btn btn--primary flex-1 px-2 text-[0.88rem]"
                  disabled={busy}
                  onClick={() => onAccept?.(view)}
                >
                  <Check size={16} aria-hidden />
                  Берём!
                </button>
                <button
                  type="button"
                  className="btn flex-1 px-2 text-[0.88rem] text-muted"
                  disabled={busy}
                  onClick={() => onReject?.(view)}
                >
                  <X size={16} aria-hidden />
                  В другой раз
                </button>
              </>
            )}
            {!isProposed && (
              <>
                <button
                  type="button"
                  className={`btn flex-1 px-2 text-[0.88rem] ${view.liked_by_me ? "btn--liked" : ""}`}
                  onClick={() => onLike(view)}
                  aria-pressed={view.liked_by_me}
                >
                  <Heart
                    size={16}
                    aria-hidden
                    fill={view.liked_by_me ? "currentColor" : "none"}
                  />
                  {view.likes_count}
                </button>
                <button
                  type="button"
                  className={`btn flex-1 px-2 text-[0.88rem] ${done ? "btn--done" : "btn--soft"}`}
                  onClick={() => onToggleDone(view)}
                >
                  <Check size={16} aria-hidden />
                  {done ? "Вернуть" : "Сделали!"}
                </button>
              </>
            )}
            <div className="relative ml-auto shrink-0" ref={menuRef}>
              <button
                type="button"
                className="btn relative px-3"
                aria-label="Ещё"
                aria-expanded={menuOpen}
                onClick={() => setMenuOpen((o) => !o)}
              >
                <MoreHorizontal size={18} aria-hidden />
                {hasDraft && (
                  <span
                    className="absolute right-2 top-2 h-2 w-2 rounded-full bg-accent"
                    aria-hidden
                  />
                )}
              </button>
              {menuOpen && (
                <div className="absolute bottom-full right-0 z-10 mb-1.5 min-w-[11.5rem] rounded-panel border border-line bg-white p-1 shadow-card">
                  <button
                    type="button"
                    className="flex w-full items-center gap-2 rounded-[0.6rem] border-0 bg-transparent px-3 py-2 text-left text-[0.92rem] text-ink transition hover:bg-accent-soft"
                    onClick={() => {
                      setMenuOpen(false);
                      setComposerOpen(true);
                      scrollCommentsToEnd();
                    }}
                  >
                    <MessageCircle size={15} aria-hidden />
                    Комментарий
                    {hasDraft && (
                      <span className="ml-auto text-[0.78rem] text-accent-deep">черновик</span>
                    )}
                  </button>
                  {canEdit && (
                    <button
                      type="button"
                      className="flex w-full items-center gap-2 rounded-[0.6rem] border-0 bg-transparent px-3 py-2 text-left text-[0.92rem] text-ink transition hover:bg-accent-soft disabled:opacity-50"
                      disabled={!detail}
                      onClick={() => {
                        setMenuOpen(false);
                        startEdit();
                      }}
                    >
                      <Pencil size={15} aria-hidden />
                      Изменить
                    </button>
                  )}
                  {canDelete && (
                    <button
                      type="button"
                      className="flex w-full items-center gap-2 rounded-[0.6rem] border-0 bg-transparent px-3 py-2 text-left text-[0.92rem] text-danger transition hover:bg-danger-soft"
                      onClick={() => {
                        setMenuOpen(false);
                        deleteNote();
                      }}
                    >
                      <Trash2 size={15} aria-hidden />
                      Удалить
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
