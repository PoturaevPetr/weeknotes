"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { BoardActionsModal } from "@/components/BoardActionsModal";
import { AvatarStack } from "@/components/AvatarStack";
import { ListAddBar } from "@/components/ListAddBar";
import { StickyHeader } from "@/components/StickyHeader";
import { UserAvatarLink } from "@/components/UserAvatarLink";
import { ApiError, api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { formatBoardsCount } from "@/lib/format";
import type { Board } from "@/lib/types";

export default function BoardsPage() {
  const { token, user, loading } = useAuth();
  const router = useRouter();
  const [boards, setBoards] = useState<Board[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);

  useEffect(() => {
    if (!loading && !token) router.replace("/login");
  }, [loading, token, router]);

  useEffect(() => {
    if (!token) return;
    api
      .listBoards(token)
      .then(setBoards)
      .catch((err: unknown) =>
        setError(err instanceof ApiError ? err.message : "Не удалось загрузить"),
      );
  }, [token]);

  async function createBoard(title: string) {
    if (!token) return;
    setBusy(true);
    try {
      const board = await api.createBoard(token, title);
      setBoards((prev) => [board, ...prev]);
      router.push(`/boards/${board.id}`);
    } catch (err) {
      throw new Error(err instanceof ApiError ? err.message : "Не удалось создать доску");
    } finally {
      setBusy(false);
    }
  }

  async function joinBoard(invite: string) {
    if (!token) return;
    setBusy(true);
    try {
      const board = await api.joinBoard(token, invite);
      setBoards((prev) => (prev.some((b) => b.id === board.id) ? prev : [board, ...prev]));
      router.push(`/boards/${board.id}`);
    } catch (err) {
      throw new Error(err instanceof ApiError ? err.message : "Не удалось вступить");
    } finally {
      setBusy(false);
    }
  }

  if (loading || !user) {
    return (
      <main className="mx-auto w-full max-w-page px-4 pb-[calc(2rem+var(--safe-bottom))] pt-[calc(1rem+var(--safe-top))] animate-rise">
        <p className="grid min-h-[50dvh] place-items-center text-muted">Загрузка…</p>
      </main>
    );
  }

  return (
    <main className="mx-auto w-full max-w-page px-4 pb-[calc(2rem+var(--safe-bottom))] pt-[calc(1rem+var(--safe-top))] animate-rise">
      <StickyHeader className="flex items-start justify-between gap-3">
        <div>
          <p className="m-0 font-display text-base font-medium tracking-[-0.03em] text-accent-deep">
            Weeknotes
          </p>
          <h1 className="m-0 mt-1 font-display text-[clamp(1.75rem,5vw,2.35rem)] font-medium leading-tight tracking-[-0.03em] text-ink">
            Ваши доски
          </h1>
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

      <ListAddBar
        title={formatBoardsCount(boards.length)}
        label="Добавить"
        onClick={() => setModalOpen(true)}
      />

      <ul className="m-0 grid list-none gap-2.5 p-0">
        {boards.map((b) => (
          <li key={b.id}>
            <Link
              href={`/boards/${b.id}`}
              className="flex min-h-[4.25rem] items-center justify-between gap-3 rounded-card border border-line bg-panel px-4 py-4 text-inherit no-underline shadow-soft backdrop-blur-md transition active:scale-[0.985] md:hover:-translate-y-px md:hover:shadow-card"
            >
              <span className="flex min-w-0 flex-col gap-0.5">
                <strong className="text-[1.02rem] font-bold text-ink">{b.title}</strong>
                <AvatarStack members={b.members ?? []} />
              </span>
              <span className="shrink-0 text-xl text-muted" aria-hidden>
                ›
              </span>
            </Link>
          </li>
        ))}
        {boards.length === 0 && (
          <li className="rounded-card border border-dashed border-line bg-white/40 px-4 py-8 text-center text-muted">
            Пока нет досок — нажмите «Добавить», чтобы создать или войти по коду
          </li>
        )}
      </ul>

      <BoardActionsModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        busy={busy}
        onCreate={createBoard}
        onJoin={joinBoard}
      />
    </main>
  );
}
