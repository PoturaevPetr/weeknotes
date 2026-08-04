"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";

import { ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth";

export default function LoginPage() {
  const { login, token, loading } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!loading && token) router.replace("/boards");
  }, [loading, token, router]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await login(email, password);
      router.replace("/boards");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Не удалось войти");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-narrow flex-col justify-center px-4 pb-[calc(2rem+var(--safe-bottom))] pt-[calc(1rem+var(--safe-top))] animate-rise">
      <div className="mb-6 flex flex-col gap-1.5">
        <div
          className="grid h-11 w-11 place-items-center rounded-[0.95rem] bg-accent font-display text-lg font-medium text-white shadow-accent"
          aria-hidden
        >
          W
        </div>
        <h1 className="font-display text-[clamp(1.75rem,5vw,2.35rem)] font-medium tracking-[-0.03em] text-ink">
          Weeknotes
        </h1>
        <p className="m-0 text-[0.98rem] leading-snug text-muted">
          Общие доски для идей, задач и заметок в реальном времени.
        </p>
      </div>
      <form className="grid gap-3" onSubmit={onSubmit}>
        <label className="flex flex-col gap-1.5">
          <span className="text-[0.82rem] font-semibold tracking-wide text-muted">Email</span>
          <input
            type="email"
            inputMode="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-[0.82rem] font-semibold tracking-wide text-muted">Пароль</span>
          <input
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
          />
        </label>
        {error && (
          <p className="m-0 rounded-panel border border-[rgba(192,57,43,0.18)] bg-danger-soft px-3.5 py-3 text-[0.92rem] text-danger">
            {error}
          </p>
        )}
        <button type="submit" className="btn btn--primary btn--block" disabled={busy}>
          {busy ? "Входим…" : "Войти"}
        </button>
      </form>
      <p className="mt-4 text-center text-[0.9rem] text-muted">
        Нет аккаунта? <Link href="/register">Зарегистрироваться</Link>
      </p>
    </main>
  );
}
