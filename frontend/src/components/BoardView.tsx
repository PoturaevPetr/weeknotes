"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { format, parseISO } from "date-fns";
import { ru } from "date-fns/locale";
import { CalendarDays, Check, Map as MapIcon, Share2, Sparkles } from "lucide-react";

import { BoardCalendar } from "@/components/BoardCalendar";
import { NoteCard } from "@/components/NoteCard";
import { NoteDetailContent } from "@/components/NoteDetailContent";
import { NoteForm } from "@/components/NoteForm";
import { ListAddBar } from "@/components/ListAddBar";
import { StickyHeader } from "@/components/StickyHeader";
import { UserAvatarLink } from "@/components/UserAvatarLink";
import { Modal } from "@/components/ui/Modal";
import { useBoardSocket } from "@/hooks/useBoardSocket";
import { ApiError, api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { formatIdeasCount, formatNotesCount, notesForCalendarDay } from "@/lib/format";
import type { AttachmentInput, Board, Note } from "@/lib/types";

const BoardMap = dynamic(() => import("@/components/BoardMap"), {
  ssr: false,
  loading: () => (
    <div className="grid min-h-[280px] place-items-center rounded-panel border border-line bg-white/50 text-muted">
      Загрузка карты…
    </div>
  ),
});

function mergeIncoming(prev: Note[], incoming: Note): Note[] {
  if (incoming.lifecycle === "rejected") {
    return prev.filter((n) => n.id !== incoming.id);
  }
  const idx = prev.findIndex((n) => n.id === incoming.id);
  if (idx === -1) return [incoming, ...prev];
  const next = [...prev];
  next[idx] = {
    ...incoming,
    liked_by_me: prev[idx].liked_by_me,
  };
  return next;
}

export function BoardView({ boardId }: { boardId: string }) {
  const { token, user, loading } = useAuth();
  const router = useRouter();
  const [board, setBoard] = useState<Board | null>(null);
  const [notes, setNotes] = useState<Note[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [coords, setCoords] = useState<{ latitude: number; longitude: number } | null>(null);
  const [tab, setTab] = useState<"notes" | "map" | "calendar">("notes");
  const [copied, setCopied] = useState(false);
  const [composeOpen, setComposeOpen] = useState(false);
  const [selectedNote, setSelectedNote] = useState<Note | null>(null);
  const [dayKey, setDayKey] = useState<string | null>(null);
  const [calendarTick, setCalendarTick] = useState(0);

  useEffect(() => {
    if (!loading && !token) router.replace("/login");
  }, [loading, token, router]);

  useEffect(() => {
    if (!token) return;
    Promise.all([api.getBoard(token, boardId), api.listNotes(token, boardId)])
      .then(([b, n]) => {
        setBoard(b);
        setNotes(n);
      })
      .catch((err: unknown) => {
        setError(err instanceof ApiError ? err.message : "Не удалось загрузить доску");
      });
  }, [token, boardId]);

  useEffect(() => {
    setSelectedNote((current) => {
      if (!current) return null;
      const fresh = notes.find((n) => n.id === current.id);
      return fresh ?? null;
    });
  }, [notes]);

  const bumpCalendar = useCallback(() => {
    setCalendarTick((t) => t + 1);
  }, []);

  const onCreated = useCallback(
    (note: Note) => {
      setNotes((prev) => (prev.some((n) => n.id === note.id) ? prev : [note, ...prev]));
      bumpCalendar();
    },
    [bumpCalendar],
  );

  const onUpdated = useCallback(
    (note: Note) => {
      setNotes((prev) => mergeIncoming(prev, note));
      bumpCalendar();
    },
    [bumpCalendar],
  );

  const onDeleted = useCallback(
    (id: string) => {
      setNotes((prev) => prev.filter((n) => n.id !== id));
      bumpCalendar();
    },
    [bumpCalendar],
  );

  const onLiked = useCallback((note: Note) => {
    setNotes((prev) => mergeIncoming(prev, note));
  }, []);

  const onUnliked = useCallback((note: Note) => {
    setNotes((prev) => mergeIncoming(prev, note));
  }, []);

  useBoardSocket(boardId, token, {
    onCreated,
    onUpdated,
    onDeleted,
    onLiked,
    onUnliked,
  });

  const acceptedNotes = useMemo(
    () => notes.filter((n) => n.lifecycle === "accepted"),
    [notes],
  );
  const proposedNotes = useMemo(
    () => notes.filter((n) => n.lifecycle === "proposed"),
    [notes],
  );

  const dayNotes = useMemo(
    () => (dayKey ? notesForCalendarDay(acceptedNotes, dayKey) : []),
    [acceptedNotes, dayKey],
  );

  const dayTitle = useMemo(() => {
    if (!dayKey) return "Заметки";
    try {
      return format(parseISO(dayKey), "d MMMM yyyy", { locale: ru });
    } catch {
      return dayKey;
    }
  }, [dayKey]);

  async function createNote(
    text: string,
    c: typeof coords,
    dueAt: string | null,
    attachments: AttachmentInput[],
  ) {
    if (!token) return;
    const note = await api.createNote(token, boardId, {
      text,
      latitude: c?.latitude ?? null,
      longitude: c?.longitude ?? null,
      due_at: dueAt,
      attachments,
    });
    setNotes((prev) => (prev.some((n) => n.id === note.id) ? prev : [note, ...prev]));
    setCoords(null);
    setComposeOpen(false);
    setTab("notes");
  }

  async function toggleLike(note: Note) {
    if (!token) return;
    const updated = note.liked_by_me
      ? await api.unlikeNote(token, note.id)
      : await api.likeNote(token, note.id);
    setNotes((prev) => prev.map((n) => (n.id === updated.id ? updated : n)));
  }

  async function toggleDone(note: Note) {
    if (!token) return;
    const updated = await api.updateNote(token, note.id, {
      status: note.status === "done" ? "open" : "done",
    });
    setNotes((prev) => prev.map((n) => (n.id === updated.id ? updated : n)));
    bumpCalendar();
  }

  async function removeNote(note: Note) {
    if (!token) return;
    await api.deleteNote(token, note.id);
    setNotes((prev) => prev.filter((n) => n.id !== note.id));
    setSelectedNote(null);
    bumpCalendar();
  }

  async function acceptNote(note: Note) {
    if (!token) return;
    const updated = await api.acceptNote(token, note.id);
    setNotes((prev) => mergeIncoming(prev, updated));
    setSelectedNote(updated);
    bumpCalendar();
  }

  async function rejectNote(note: Note) {
    if (!token) return;
    await api.rejectNote(token, note.id);
    setNotes((prev) => prev.filter((n) => n.id !== note.id));
    setSelectedNote(null);
  }

  async function copyInvite() {
    if (!board) return;
    try {
      await navigator.clipboard.writeText(board.invite_code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      setError("Не удалось скопировать код");
    }
  }

  if (loading || !user) {
    return (
      <main className="mx-auto w-full max-w-[1120px] px-4 pb-[calc(1.5rem+var(--safe-bottom))] pt-[calc(1rem+var(--safe-top))] animate-rise">
        <p className="grid min-h-[50dvh] place-items-center text-muted">Загрузка…</p>
      </main>
    );
  }

  return (
    <main className="mx-auto w-full max-w-[1120px] px-4 pb-[calc(1rem+var(--safe-bottom))] pt-[calc(1rem+var(--safe-top))] animate-rise">
      <StickyHeader className="flex items-start justify-between gap-3">
        <div>
          <Link
            href="/boards"
            className="inline-flex min-h-8 items-center gap-1 text-[0.9rem] text-muted no-underline"
          >
            ← Доски
          </Link>
          <h1 className="m-0 mt-1 font-display text-[clamp(1.75rem,5vw,2.35rem)] font-medium leading-tight tracking-[-0.03em] text-ink">
            {board?.title ?? "Доска"}
          </h1>
          {board && (
            <div className="mt-1.5 flex flex-wrap items-center gap-2">
              <button type="button" className="btn btn--soft" onClick={copyInvite}>
                {copied ? <Check size={16} aria-hidden /> : <Share2 size={16} aria-hidden />}
                {copied ? "Код у вас!" : "Позвать друзей"}
              </button>
              {(
                [
                  ["map", "Карта", MapIcon],
                  ["calendar", "Календарь", CalendarDays],
                ] as const
              ).map(([id, label, Icon]) => (
                <button
                  key={id}
                  type="button"
                  aria-pressed={tab === id}
                  className={`btn ${tab === id ? "btn--primary" : ""}`}
                  onClick={() => setTab(tab === id ? "notes" : id)}
                >
                  <Icon size={16} aria-hidden />
                  {label}
                </button>
              ))}
            </div>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <UserAvatarLink user={user} />
        </div>
      </StickyHeader>

      {error && (
        <p className="mb-4 rounded-panel border border-[rgba(192,57,43,0.18)] bg-danger-soft px-3.5 py-3 text-[0.92rem] text-danger">
          {error}
        </p>
      )}

      {tab === "notes" && (
        <section className="grid gap-3.5 animate-fade">
          <ListAddBar
            title={formatNotesCount(acceptedNotes.length)}
            label="Предложить идею"
            onClick={() => {
              setError(null);
              setComposeOpen(true);
            }}
          />
          <div className="grid gap-3">
            {proposedNotes.length > 0 && (
              <p className="m-0 inline-flex items-center gap-1.5 text-[0.88rem] font-medium text-[#8a6b1f]">
                <Sparkles size={15} aria-hidden />
                {formatIdeasCount(proposedNotes.length)} от вашей компании — что берём в планы?
              </p>
            )}
            {proposedNotes.map((note) => (
              <NoteCard
                key={note.id}
                note={note}
                onOpen={setSelectedNote}
                currentUserId={user.id}
                onAccept={acceptNote}
                onReject={rejectNote}
              />
            ))}
            {notes.length === 0 && (
              <div className="grid justify-items-center gap-2 rounded-card border border-dashed border-line bg-white/40 px-4 py-9 text-center text-muted">
                <Sparkles size={26} className="text-accent" aria-hidden />
                <span>
                  Пока тихо — добавьте первую идею:
                  <br />
                  куда сходим, что посмотрим, что попробуем?
                </span>
              </div>
            )}
            {acceptedNotes.map((note) => (
              <NoteCard key={note.id} note={note} onOpen={setSelectedNote} />
            ))}
          </div>
        </section>
      )}

      {tab === "map" && (
        <aside className="grid gap-3.5 animate-fade">
          <div className="rounded-card border border-line bg-panel p-4 shadow-soft backdrop-blur-md">
            <h2 className="m-0 mb-2 font-sans text-[1.05rem] font-semibold tracking-tight text-ink">
              Карта
            </h2>
            <p className="mb-3 text-[0.9rem] leading-snug text-muted">
              {notes.some((n) => n.latitude != null && n.longitude != null)
                ? "Все места из ваших планов и идей — нажмите на маркер"
                : "Здесь появятся места из ваших планов — добавьте идею с точкой на карте"}
            </p>
            <BoardMap notes={notes} onOpenNote={setSelectedNote} />
          </div>
        </aside>
      )}

      {tab === "calendar" && token && (
        <section className="grid gap-3.5 animate-fade" key={calendarTick}>
          <BoardCalendar
            boardId={boardId}
            token={token}
            onSelectDay={(key) => setDayKey(key)}
          />
        </section>
      )}

      <Modal open={composeOpen} onClose={() => setComposeOpen(false)} title="Новая идея">
        <NoteForm onSubmit={createNote} coords={coords} onCoordsChange={setCoords} />
      </Modal>

      <Modal
        open={!!dayKey}
        onClose={() => setDayKey(null)}
        title={dayTitle}
        tall
      >
        <div className="flex h-full min-h-0 flex-col overflow-x-hidden overflow-y-auto overscroll-contain">
          <p className="mb-3 text-[0.9rem] text-muted">{formatNotesCount(dayNotes.length)}</p>
          <div className="grid gap-3 pb-2">
            {dayNotes.length === 0 && (
              <div className="rounded-card border border-dashed border-line bg-white/40 px-4 py-8 text-center text-muted">
                На этот день пока ничего не запланировано
              </div>
            )}
            {dayNotes.map((note) => (
              <NoteCard
                key={note.id}
                note={note}
                onOpen={(n) => {
                  setSelectedNote(n);
                }}
              />
            ))}
          </div>
        </div>
      </Modal>

      <Modal
        open={!!selectedNote}
        onClose={() => setSelectedNote(null)}
        title={selectedNote?.lifecycle === "proposed" ? "Идея" : "Заметка"}
        tall
      >
        {selectedNote && token && (
          <NoteDetailContent
            note={selectedNote}
            token={token}
            currentUserId={user.id}
            onLike={toggleLike}
            onToggleDone={toggleDone}
            onDelete={removeNote}
            onAccept={acceptNote}
            onReject={rejectNote}
            onUpdated={(updated) => {
              const asList: Note = {
                ...updated,
                attachments: (updated.attachments ?? []).map(
                  ({ id, kind, mime_type, filename }) => ({
                    id,
                    kind,
                    mime_type,
                    filename,
                  }),
                ),
              };
              setNotes((prev) => mergeIncoming(prev, asList));
              setSelectedNote((prev) =>
                prev && prev.id === asList.id
                  ? asList.lifecycle === "rejected"
                    ? null
                    : asList
                  : prev,
              );
              bumpCalendar();
            }}
          />
        )}
      </Modal>
    </main>
  );
}
