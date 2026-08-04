"use client";

import { FormEvent, useState } from "react";

import { Modal } from "@/components/ui/Modal";

type Props = {
  open: boolean;
  onClose: () => void;
  busy: boolean;
  onCreate: (title: string) => Promise<void>;
  onJoin: (invite: string) => Promise<void>;
};

export function BoardActionsModal({ open, onClose, busy, onCreate, onJoin }: Props) {
  const [tab, setTab] = useState<"create" | "join">("create");
  const [title, setTitle] = useState("");
  const [invite, setInvite] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function submitCreate(e: FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    setError(null);
    try {
      await onCreate(title.trim());
      setTitle("");
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не удалось создать");
    }
  }

  async function submitJoin(e: FormEvent) {
    e.preventDefault();
    if (!invite.trim()) return;
    setError(null);
    try {
      await onJoin(invite.trim());
      setInvite("");
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не удалось вступить");
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Доска">
      <div className="min-h-0 min-w-0 overflow-x-hidden overflow-y-auto overscroll-contain">
      <div
        className="mb-4 grid grid-cols-2 gap-1 rounded-full border border-line bg-white/65 p-1"
        role="tablist"
      >
        <button
          type="button"
          role="tab"
          aria-selected={tab === "create"}
          className={`min-h-[2.55rem] rounded-full border-0 font-semibold transition ${
            tab === "create" ? "bg-panel-solid text-ink shadow-soft" : "bg-transparent text-muted"
          }`}
          onClick={() => {
            setTab("create");
            setError(null);
          }}
        >
          Создать
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === "join"}
          className={`min-h-[2.55rem] rounded-full border-0 font-semibold transition ${
            tab === "join" ? "bg-panel-solid text-ink shadow-soft" : "bg-transparent text-muted"
          }`}
          onClick={() => {
            setTab("join");
            setError(null);
          }}
        >
          Присоединиться
        </button>
      </div>

      {error && (
        <p className="mb-4 rounded-panel border border-[rgba(192,57,43,0.18)] bg-danger-soft px-3.5 py-3 text-[0.92rem] text-danger">
          {error}
        </p>
      )}

      {tab === "create" ? (
        <form className="grid gap-1" onSubmit={submitCreate}>
          <label className="mb-4 flex flex-col gap-1.5">
            <span className="text-[0.82rem] font-semibold tracking-wide text-muted">Название</span>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Команда, поездка, идеи…"
              required
              autoFocus
            />
          </label>
          <button type="submit" className="btn btn--primary btn--block" disabled={busy}>
            Создать доску
          </button>
        </form>
      ) : (
        <form className="grid gap-1" onSubmit={submitJoin}>
          <label className="mb-4 flex flex-col gap-1.5">
            <span className="text-[0.82rem] font-semibold tracking-wide text-muted">Invite-код</span>
            <input
              value={invite}
              onChange={(e) => setInvite(e.target.value)}
              placeholder="Вставьте код приглашения"
              required
              autoCapitalize="off"
              autoCorrect="off"
              autoFocus
            />
          </label>
          <button type="submit" className="btn btn--primary btn--block" disabled={busy}>
            Присоединиться
          </button>
        </form>
      )}
      </div>
    </Modal>
  );
}
