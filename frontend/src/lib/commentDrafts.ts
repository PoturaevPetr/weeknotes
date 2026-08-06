const PREFIX = "weeknotes:comment-draft:";

function storage(): Storage | null {
  try {
    return typeof window === "undefined" ? null : window.localStorage;
  } catch {
    // Private mode or blocked storage: drafts are a convenience, never fatal.
    return null;
  }
}

export function readCommentDraft(noteId: string): string {
  try {
    return storage()?.getItem(PREFIX + noteId) ?? "";
  } catch {
    return "";
  }
}

export function saveCommentDraft(noteId: string, text: string): void {
  const store = storage();
  if (!store) return;
  try {
    if (text.trim()) store.setItem(PREFIX + noteId, text);
    else store.removeItem(PREFIX + noteId);
  } catch {
    /* out of quota — nothing worth interrupting the user for */
  }
}

export function clearCommentDraft(noteId: string): void {
  saveCommentDraft(noteId, "");
}
