export type User = {
  id: string;
  email: string;
  display_name: string;
  created_at: string;
};

export type BoardMember = {
  id: string;
  display_name: string;
};

export type Board = {
  id: string;
  title: string;
  invite_code: string;
  owner_id: string;
  created_at: string;
  members: BoardMember[];
};

export type AttachmentMeta = {
  id: string;
  kind: "image";
  mime_type: string;
  filename: string;
};

export type Attachment = AttachmentMeta & {
  data_base64: string;
};

export type Note = {
  id: string;
  board_id: string;
  author: { id: string; display_name: string };
  text: string;
  status: "open" | "done";
  lifecycle: "proposed" | "accepted" | "rejected";
  latitude: number | null;
  longitude: number | null;
  due_at: string | null;
  completed_at: string | null;
  likes_count: number;
  liked_by_me: boolean;
  attachments: AttachmentMeta[];
  created_at: string;
  updated_at: string;
};

export type NoteDetail = Omit<Note, "attachments"> & {
  attachments: Attachment[];
};

export type AttachmentInput = {
  kind: "image";
  mime_type: string;
  filename: string;
  data_base64: string;
};

export type CalendarCover = {
  mime_type: string;
  data_base64: string;
};

export type CalendarDay = {
  date: string;
  count: number;
  cover: CalendarCover | null;
};

export type CalendarResponse = {
  days: CalendarDay[];
};

export type WsEvent = {
  event: string;
  payload: Record<string, unknown>;
};
