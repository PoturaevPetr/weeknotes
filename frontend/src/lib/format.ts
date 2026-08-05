export function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

const AVATAR_PALETTES = [
  { bg: "#ffe8de", fg: "#bf4a27" }, // персик
  { bg: "#ffe9f0", fg: "#c2426a" }, // розовый
  { bg: "#eae2f6", fg: "#6b58a6" }, // лаванда
  { bg: "#e6f2eb", fg: "#3f7a60" }, // мята
  { bg: "#fdf0d5", fg: "#a3762a" }, // мёд
] as const;

/** Stable pastel color pair for a user avatar, derived from the name. */
export function avatarPalette(name: string): { bg: string; fg: string } {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = (hash * 31 + name.charCodeAt(i)) | 0;
  }
  return AVATAR_PALETTES[Math.abs(hash) % AVATAR_PALETTES.length];
}

/** Russian plural: 1 доска, 2 доски, 5 досок */
export function pluralRu(n: number, one: string, few: string, many: string): string {
  const abs = Math.abs(n);
  const n10 = abs % 10;
  const n100 = abs % 100;
  if (n10 === 1 && n100 !== 11) return one;
  if (n10 >= 2 && n10 <= 4 && (n100 < 12 || n100 > 14)) return few;
  return many;
}

export function formatBoardsCount(n: number): string {
  if (n === 0) return "Нет досок";
  return `${n} ${pluralRu(n, "доска", "доски", "досок")}`;
}

export function formatNotesCount(n: number): string {
  if (n === 0) return "Нет заметок";
  return `${n} ${pluralRu(n, "заметка", "заметки", "заметок")}`;
}

export function formatIdeasCount(n: number): string {
  if (n === 0) return "Нет идей";
  return `${n} ${pluralRu(n, "идея", "идеи", "идей")}`;
}

export function formatDueDate(iso: string): string {
  return new Date(iso).toLocaleString("ru-RU", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** Open note with due_at within the next 2 days (or overdue). */
export function isDueSoon(dueAt: string | null | undefined, status: string): boolean {
  if (!dueAt || status === "done") return false;
  const due = new Date(dueAt).getTime();
  if (Number.isNaN(due)) return false;
  const msLeft = due - Date.now();
  return msLeft < 2 * 24 * 60 * 60 * 1000;
}

export function formatNoteTime(iso: string): string {
  const date = new Date(iso);
  const now = new Date();
  const sameDay = date.toDateString() === now.toDateString();
  if (sameDay) {
    return date.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" });
  }
  return date.toLocaleString("ru-RU", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** YYYY-MM-DD in local timezone */
export function toLocalDateKey(iso: string): string {
  const d = new Date(iso);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Notes linked to a calendar day via created / due / completed. */
export function notesForCalendarDay<
  T extends { created_at: string; due_at: string | null; completed_at: string | null },
>(notes: T[], dayKey: string): T[] {
  return notes.filter((n) => {
    if (toLocalDateKey(n.created_at) === dayKey) return true;
    if (n.due_at && toLocalDateKey(n.due_at) === dayKey) return true;
    if (n.completed_at && toLocalDateKey(n.completed_at) === dayKey) return true;
    return false;
  });
}
