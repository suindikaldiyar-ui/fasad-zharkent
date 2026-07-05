"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const from = params.get("from") || "/";

  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit() {
    if (loading) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data?.ok) {
        router.replace(from.startsWith("/") ? from : "/");
        router.refresh();
      } else {
        setError("Неверный пароль");
      }
    } catch {
      setError("Ошибка соединения. Попробуйте ещё раз.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-5">
      <div className="w-full max-w-sm rounded-2xl border border-line bg-surface p-7 shadow-card">
        {/* Монограмма-логотип «FZ» */}
        <div className="mb-6 flex justify-center">
          <span className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-gold to-goldLight text-lg font-extrabold tracking-tight text-stone shadow-gold">
            FZ
          </span>
        </div>

        <h1 className="text-center text-xl font-extrabold text-ink">Fasad Zharkent</h1>
        <p className="mt-1 text-center text-sm text-muted">
          Введите пароль для доступа
        </p>

        <div className="mt-6">
          <input
            type="password"
            value={password}
            autoFocus
            placeholder="Пароль"
            onChange={(e) => {
              setPassword(e.target.value);
              if (error) setError(null);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") submit();
            }}
            className="w-full rounded-xl border border-line bg-canvas px-3.5 py-2.5 text-base font-semibold text-ink outline-none transition placeholder:text-muted/40 focus:border-gold focus:ring-2 focus:ring-gold/30"
          />

          {error && (
            <p className="mt-2 text-sm font-medium text-red-400">{error}</p>
          )}

          <button
            type="button"
            onClick={submit}
            disabled={loading}
            className="mt-4 w-full rounded-xl bg-gradient-to-br from-gold to-goldLight px-4 py-3 text-sm font-bold text-stone shadow-gold transition hover:brightness-110 disabled:opacity-60"
          >
            {loading ? "Проверка…" : "Войти"}
          </button>
        </div>
      </div>
    </main>
  );
}
