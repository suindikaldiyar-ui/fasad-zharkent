// Простой in-memory rate limiter по IP.
//
// ВНИМАНИЕ (продакшн): на Vercel serverless состояние живёт в памяти конкретного
// инстанса и сбрасывается между холодными стартами и не разделяется между разными
// инстансами/лямбдами. Этого достаточно, чтобы отбить простой спам и brute-force,
// но для НАДЁЖНОГО распределённого лимита нужен внешний стор — Upstash Redis
// (@upstash/ratelimit). Здесь намеренно без внешних зависимостей.

import type { NextRequest } from "next/server";

// IP клиента: первый из x-forwarded-for, иначе x-real-ip.
export function getClientIp(req: NextRequest): string {
  const xff = req.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0].trim();
  return req.headers.get("x-real-ip") || "unknown";
}

type Bucket = { count: number; resetAt: number };
const buckets = new Map<string, Bucket>();

// Скользящее окно фикс. длины: max запросов за windowMs на ключ.
export function rateLimit(
  key: string,
  max: number,
  windowMs: number
): { ok: boolean; retryAfter: number } {
  const now = Date.now();

  // Опортунистическая уборка, чтобы Map не рос бесконечно.
  if (buckets.size > 5000) {
    buckets.forEach((v, k) => {
      if (now >= v.resetAt) buckets.delete(k);
    });
  }

  const b = buckets.get(key);
  if (!b || now >= b.resetAt) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true, retryAfter: 0 };
  }
  b.count++;
  if (b.count > max) {
    return { ok: false, retryAfter: Math.ceil((b.resetAt - now) / 1000) };
  }
  return { ok: true, retryAfter: 0 };
}

// ── Brute-force защита пароля: счётчик неудач + временный блок IP ──
type Attempt = { fails: number; blockedUntil: number };
const attempts = new Map<string, Attempt>();

export function isBlocked(ip: string): { blocked: boolean; retryAfter: number } {
  const a = attempts.get(ip);
  if (a && a.blockedUntil > Date.now()) {
    return { blocked: true, retryAfter: Math.ceil((a.blockedUntil - Date.now()) / 1000) };
  }
  return { blocked: false, retryAfter: 0 };
}

// Регистрируем неудачную попытку. После maxFails — блок на blockMs.
export function registerFail(ip: string, maxFails: number, blockMs: number): void {
  const a = attempts.get(ip) ?? { fails: 0, blockedUntil: 0 };
  a.fails++;
  if (a.fails >= maxFails) {
    a.blockedUntil = Date.now() + blockMs;
    a.fails = 0; // счётчик сброшен, действует блок
  }
  attempts.set(ip, a);
}

// Успешный вход — снимаем все ограничения по IP.
export function resetFails(ip: string): void {
  attempts.delete(ip);
}
