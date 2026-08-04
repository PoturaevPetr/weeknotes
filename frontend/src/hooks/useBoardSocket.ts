"use client";

import { useEffect, useRef } from "react";

import { wsUrl } from "@/lib/api";
import type { Note, WsEvent } from "@/lib/types";

type Handlers = {
  onCreated: (note: Note) => void;
  onUpdated: (note: Note) => void;
  onDeleted: (id: string) => void;
  onLiked: (note: Note) => void;
  onUnliked: (note: Note) => void;
};

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
