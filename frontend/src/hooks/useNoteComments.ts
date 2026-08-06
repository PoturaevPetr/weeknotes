"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { api } from "@/lib/api";
import { clearCommentDraft, readCommentDraft, saveCommentDraft } from "@/lib/commentDrafts";
import type { Comment, CommentEvent } from "@/lib/types";

type Options = {
  noteId: string;
  token: string;
  subscribe?: (listener: (event: CommentEvent) => void) => () => void;
  onCountChange?: (noteId: string, count: number) => void;
};

function sortByTime(list: Comment[]): Comment[] {
  return [...list].sort((a, b) => {
    const diff = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
    return diff !== 0 ? diff : a.id.localeCompare(b.id);
  });
}

function withComment(list: Comment[], incoming: Comment): Comment[] {
  if (list.some((c) => c.id === incoming.id)) return list;
  return sortByTime([...list, incoming]);
}

/**
 * Comments for one note: loading, socket updates, likes and the persisted draft.
 * The list and the composer live in different parts of the modal, so the state
 * they share sits here.
 */
export function useNoteComments({ noteId, token, subscribe, onCountChange }: Options) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [draft, setDraftState] = useState(() => readCommentDraft(noteId));
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const countChangeRef = useRef(onCountChange);
  countChangeRef.current = onCountChange;

  useEffect(() => {
    let cancelled = false;
    setComments([]);
    setLoaded(false);
    setLoadError(null);
    setSendError(null);
    setActionError(null);
    setDraftState(readCommentDraft(noteId));
    api
      .listComments(token, noteId)
      .then((list) => {
        if (cancelled) return;
        // Union with what is already here: socket events may land mid-request.
        setComments((prev) => {
          const byId = new Map(prev.map((c) => [c.id, c]));
          for (const c of list) byId.set(c.id, c);
          return sortByTime([...byId.values()]);
        });
        setLoaded(true);
      })
      .catch(() => {
        if (!cancelled) setLoadError("Не получилось загрузить комментарии");
      });
    return () => {
      cancelled = true;
    };
  }, [noteId, token]);

  useEffect(() => {
    if (!subscribe) return;
    return subscribe((event) => {
      if (event.note_id !== noteId) return;
      if (event.kind === "created") {
        setComments((prev) => withComment(prev, event.comment));
        return;
      }
      if (event.kind === "deleted") {
        setComments((prev) => prev.filter((c) => c.id !== event.comment_id));
        return;
      }
      setComments((prev) =>
        prev.map((c) => (c.id === event.comment_id ? { ...c, likes_count: event.likes_count } : c)),
      );
    });
  }, [subscribe, noteId]);

  useEffect(() => {
    if (!loaded) return;
    countChangeRef.current?.(noteId, comments.length);
  }, [comments.length, loaded, noteId]);

  const setDraft = useCallback(
    (text: string) => {
      setDraftState(text);
      saveCommentDraft(noteId, text);
    },
    [noteId],
  );

  const submit = useCallback(async (): Promise<boolean> => {
    const text = draft.trim();
    if (!text || sending) return false;
    setSending(true);
    setSendError(null);
    try {
      const created = await api.addComment(token, noteId, text);
      setComments((prev) => withComment(prev, created));
      setDraftState("");
      clearCommentDraft(noteId);
      return true;
    } catch (err) {
      setSendError(
        err instanceof Error ? err.message : "Не получилось отправить — попробуйте ещё раз",
      );
      return false;
    } finally {
      setSending(false);
    }
  }, [draft, sending, noteId, token]);

  const toggleLike = useCallback(
    async (comment: Comment) => {
      const liked = comment.liked_by_me;
      setActionError(null);
      setComments((prev) =>
        prev.map((c) =>
          c.id === comment.id
            ? {
                ...c,
                liked_by_me: !liked,
                likes_count: Math.max(0, c.likes_count + (liked ? -1 : 1)),
              }
            : c,
        ),
      );
      try {
        const updated = liked
          ? await api.unlikeComment(token, comment.id)
          : await api.likeComment(token, comment.id);
        setComments((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
      } catch {
        setComments((prev) =>
          prev.map((c) =>
            c.id === comment.id
              ? { ...c, liked_by_me: liked, likes_count: comment.likes_count }
              : c,
          ),
        );
        setActionError("Не получилось поставить лайк");
      }
    },
    [token],
  );

  const remove = useCallback(
    async (comment: Comment) => {
      setActionError(null);
      try {
        await api.deleteComment(token, comment.id);
        setComments((prev) => prev.filter((c) => c.id !== comment.id));
      } catch (err) {
        setActionError(
          err instanceof Error ? err.message : "Не получилось удалить комментарий",
        );
      }
    },
    [token],
  );

  return {
    comments,
    loaded,
    loadError,
    actionError,
    sendError,
    draft,
    setDraft,
    sending,
    submit,
    toggleLike,
    remove,
  };
}
