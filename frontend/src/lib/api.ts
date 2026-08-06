import type {
  AttachmentInput,
  Board,
  CalendarResponse,
  Comment,
  Note,
  NoteDetail,
  User,
} from "./types";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export class ApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

async function request<T>(
  path: string,
  options: RequestInit = {},
  token?: string | null,
): Promise<T> {
  const headers = new Headers(options.headers);
  if (!headers.has("Content-Type") && options.body) {
    headers.set("Content-Type", "application/json");
  }
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const res = await fetch(`${API_URL}${path}`, { ...options, headers });
  if (res.status === 204) {
    return undefined as T;
  }

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const detail = formatApiDetail(data.detail);
    throw new ApiError(res.status, detail);
  }
  return data as T;
}

function formatApiDetail(detail: unknown): string {
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail)) {
    return detail
      .map((d: { loc?: unknown[]; msg?: string }) => {
        const where = Array.isArray(d.loc) ? d.loc.filter((x) => x !== "body").join(".") : "";
        return where ? `${where}: ${d.msg ?? "invalid"}` : d.msg ?? "invalid";
      })
      .join("; ");
  }
  if (detail && typeof detail === "object") return JSON.stringify(detail);
  return "Request failed";
}

export const api = {
  register: (body: { email: string; password: string; display_name: string }) =>
    request<{ access_token: string; user: User }>("/auth/register", {
      method: "POST",
      body: JSON.stringify(body),
    }),

  login: (body: { email: string; password: string }) =>
    request<{ access_token: string; user: User }>("/auth/login", {
      method: "POST",
      body: JSON.stringify(body),
    }),

  me: (token: string) => request<User>("/auth/me", {}, token),

  listBoards: (token: string) => request<Board[]>("/boards", {}, token),

  createBoard: (token: string, title: string) =>
    request<Board>("/boards", { method: "POST", body: JSON.stringify({ title }) }, token),

  joinBoard: (token: string, invite_code: string) =>
    request<Board>(
      "/boards/join",
      { method: "POST", body: JSON.stringify({ invite_code }) },
      token,
    ),

  getBoard: (token: string, id: string) => request<Board>(`/boards/${id}`, {}, token),

  listNotes: (token: string, boardId: string) =>
    request<Note[]>(`/boards/${boardId}/notes`, {}, token),

  getCalendar: (token: string, boardId: string, from: string, to: string) => {
    const tz = new Date().getTimezoneOffset();
    return request<CalendarResponse>(
      `/boards/${boardId}/calendar?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}&tz_offset=${tz}`,
      {},
      token,
    );
  },

  createNote: (
    token: string,
    boardId: string,
    body: {
      text: string;
      latitude?: number | null;
      longitude?: number | null;
      due_at?: string | null;
      attachments?: AttachmentInput[];
    },
  ) =>
    request<Note>(
      `/boards/${boardId}/notes`,
      { method: "POST", body: JSON.stringify(body) },
      token,
    ),

  getNote: (token: string, noteId: string) =>
    request<NoteDetail>(`/notes/${noteId}`, {}, token),

  updateNote: (
    token: string,
    noteId: string,
    body: Partial<{
      text: string;
      status: string;
      latitude: number | null;
      longitude: number | null;
      due_at: string | null;
    }>,
  ) =>
    request<Note>(`/notes/${noteId}`, { method: "PATCH", body: JSON.stringify(body) }, token),

  addAttachments: (token: string, noteId: string, attachments: AttachmentInput[]) =>
    request<NoteDetail>(
      `/notes/${noteId}/attachments`,
      { method: "POST", body: JSON.stringify({ attachments }) },
      token,
    ),

  deleteAttachment: (token: string, noteId: string, attachmentId: string) =>
    request<Note>(`/notes/${noteId}/attachments/${attachmentId}`, { method: "DELETE" }, token),

  deleteNote: (token: string, noteId: string) =>
    request<void>(`/notes/${noteId}`, { method: "DELETE" }, token),

  likeNote: (token: string, noteId: string) =>
    request<Note>(`/notes/${noteId}/like`, { method: "POST" }, token),

  unlikeNote: (token: string, noteId: string) =>
    request<Note>(`/notes/${noteId}/like`, { method: "DELETE" }, token),

  acceptNote: (token: string, noteId: string) =>
    request<Note>(`/notes/${noteId}/accept`, { method: "POST" }, token),

  rejectNote: (token: string, noteId: string) =>
    request<Note>(`/notes/${noteId}/reject`, { method: "POST" }, token),

  listComments: (token: string, noteId: string) =>
    request<Comment[]>(`/notes/${noteId}/comments`, {}, token),

  addComment: (token: string, noteId: string, text: string) =>
    request<Comment>(
      `/notes/${noteId}/comments`,
      { method: "POST", body: JSON.stringify({ text }) },
      token,
    ),

  deleteComment: (token: string, commentId: string) =>
    request<void>(`/comments/${commentId}`, { method: "DELETE" }, token),

  likeComment: (token: string, commentId: string) =>
    request<Comment>(`/comments/${commentId}/like`, { method: "POST" }, token),

  unlikeComment: (token: string, commentId: string) =>
    request<Comment>(`/comments/${commentId}/like`, { method: "DELETE" }, token),
};

export function wsUrl(boardId: string, token: string): string {
  const base = process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:8000";
  return `${base}/ws/boards/${boardId}?token=${encodeURIComponent(token)}`;
}
