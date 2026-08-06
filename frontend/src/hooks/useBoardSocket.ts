"use client";

import { useEffect, useRef } from "react";

import { wsUrl } from "@/lib/api";
import type { Comment, CommentEvent, Note, WsEvent } from "@/lib/types";

type Handlers = {
  onCreated: (note: Note) => void;
  onUpdated: (note: Note) => void;
  onDeleted: (id: string) => void;
  onLiked: (note: Note) => void;
  onUnliked: (note: Note) => void;
  onComment?: (event: CommentEvent) => void;
};

function toCommentEvent(event: string, payload: Record<string, unknown>): CommentEvent | null {
  const noteId = String(payload.note_id ?? "");
  if (!noteId) return null;
  if (event === "comment.created") {
    return {
      kind: "created",
      note_id: noteId,
      comments_count: Number(payload.comments_count ?? 0),
      comment: payload.comment as unknown as Comment,
    };
  }
  if (event === "comment.deleted") {
    return {
      kind: "deleted",
      note_id: noteId,
      comment_id: String(payload.comment_id ?? ""),
      comments_count: Number(payload.comments_count ?? 0),
    };
  }
  if (event === "comment.liked" || event === "comment.unliked") {
    return {
      kind: "likes",
      note_id: noteId,
      comment_id: String(payload.comment_id ?? ""),
      likes_count: Number(payload.likes_count ?? 0),
    };
  }
  return null;
}

export function useBoardSocket(boardId: string | null, token: string | null, handlers: Handlers) {
  const handlersRef = useRef(handlers);
  handlersRef.current = handlers;

  useEffect(() => {
    if (!boardId || !token) return;

    let closed = false;
    let socket: WebSocket | null = null;
    let retry: ReturnType<typeof setTimeout> | null = null;

    const connect = () => {
      if (closed) return;
      socket = new WebSocket(wsUrl(boardId, token));

      socket.onmessage = (ev) => {
        try {
          const data = JSON.parse(ev.data) as WsEvent;
          const h = handlersRef.current;
          if (data.event === "note.created") h.onCreated(data.payload as unknown as Note);
          if (data.event === "note.updated") h.onUpdated(data.payload as unknown as Note);
          if (data.event === "note.deleted") h.onDeleted(String(data.payload.id));
          if (data.event === "note.liked") h.onLiked(data.payload as unknown as Note);
          if (data.event === "note.unliked") h.onUnliked(data.payload as unknown as Note);
          if (data.event.startsWith("comment.")) {
            const commentEvent = toCommentEvent(data.event, data.payload);
            if (commentEvent) h.onComment?.(commentEvent);
          }
        } catch {
          /* ignore malformed */
        }
      };

      socket.onclose = () => {
        if (!closed) retry = setTimeout(connect, 2000);
      };
    };

    connect();

    return () => {
      closed = true;
      if (retry) clearTimeout(retry);
      socket?.close();
    };
  }, [boardId, token]);
}
