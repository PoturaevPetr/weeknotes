"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

import { StickyHeader } from "@/components/StickyHeader";
import { useAuth } from "@/lib/auth";
import { initials } from "@/lib/format";

export default function ProfilePage() {
  const { user, loading, logout } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) router.replace("/login");
  }, [loading, user, router]);

  function handleLogout() {
    logout();
    router.replace("/login");
  }

  if (loading || !user) {
    return (
      <main className="mx-auto w-full max-w-page px-4 pb-[calc(2rem+var(--safe-bottom))] pt-[calc(1rem+var(--safe-top))] animate-rise">
        <p className="grid min-h-[50dvh] place-items-center text-muted">Загрузка…</p>
      </main>
    );
  }

  const created = new Date(user.created_at).toLocaleDateString("ru-RU", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-page flex-col px-4 pb-[calc(2rem+var(--safe-bottom))] pt-[calc(1rem+var(--safe-top))] animate-rise">
      <StickyHeader>
        <Link
          href="/boards"
          className="inline-flex min-h-8 items-center gap-1 text-[0.9rem] text-muted no-underline"
        >
          ← Назад
        </Link>
        <h1 className="m-0 mt-1 font-display text-[clamp(1.75rem,5vw,2.35rem)] font-medium leading-tight tracking-[-0.03em] text-ink">
          Профиль
        </h1>
      </StickyHeader>

      <section className="rounded-card border border-line bg-panel p-6 text-center shadow-soft backdrop-blur-md">
        <div
          className="mx-auto mb-3 grid h-[4.5rem] w-[4.5rem] place-items-center rounded-full bg-accent-soft text-[1.35rem] font-bold text-accent-deep"
          aria-hidden
        >
          {initials(user.display_name)}
        </div>
        <h2 className="m-0 mb-4 font-sans text-xl font-semibold tracking-tight text-ink">
          {user.display_name}
        </h2>
        <dl className="m-0 grid gap-3 text-left">
          <div>
            <dt className="text-[0.82rem] font-semibold text-muted">Email</dt>
            <dd className="m-0 mt-0.5 text-ink-soft">{user.email}</dd>
          </div>
          <div>
            <dt className="text-[0.82rem] font-semibold text-muted">В системе с</dt>
            <dd className="m-0 mt-0.5 text-ink-soft">{created}</dd>
          </div>
        </dl>
      </section>

      <div className="mt-auto pt-8">
        <button type="button" className="btn btn--danger btn--block" onClick={handleLogout}>
          Выйти
        </button>
      </div>
    </main>
  );
}
