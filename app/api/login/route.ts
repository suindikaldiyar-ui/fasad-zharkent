import { NextRequest, NextResponse } from "next/server";
import { createHash, timingSafeEqual } from "crypto";
import { sha256Hex, AUTH_COOKIE } from "@/lib/auth";
import {
  getClientIp,
  rateLimit,
  isBlocked,
  registerFail,
  resetFails,
} from "@/lib/ratelimit";

export const runtime = "nodejs";

// Предупреждение при старте, если секрет не задан (билд не роняем).
if (!process.env.SITE_PASSWORD) {
  console.warn("[security] SITE_PASSWORD не задан — вход работать не будет.");
}

const MAX_ATTEMPTS = 5; // попыток за окно / до блокировки
const WINDOW_MS = 60_000; // окно rate limit — 60 сек
const BLOCK_MS = 5 * 60_000; // блок IP после 5 неудач — 5 мин

// Сравнение паролей в постоянное время (защита от timing-атак).
function safeEqual(a: string, b: string): boolean {
  const ha = createHash("sha256").update(a).digest();
  const hb = createHash("sha256").update(b).digest();
  return timingSafeEqual(ha, hb);
}

export async function POST(req: NextRequest) {
  const ip = getClientIp(req);

  // 1) Заблокирован ли IP (brute-force) — 429 даже при верном пароле.
  const blocked = isBlocked(ip);
  if (blocked.blocked) {
    return NextResponse.json(
      { ok: false, error: "Слишком много попыток, попробуйте позже" },
      { status: 429, headers: { "Retry-After": String(blocked.retryAfter) } }
    );
  }

  // 2) Rate limit: не более 5 попыток входа с IP за 60 сек.
  const rl = rateLimit(`login:${ip}`, MAX_ATTEMPTS, WINDOW_MS);
  if (!rl.ok) {
    return NextResponse.json(
      { ok: false, error: "Слишком много попыток, попробуйте позже" },
      { status: 429, headers: { "Retry-After": String(rl.retryAfter) } }
    );
  }

  const expected = process.env.SITE_PASSWORD;
  if (!expected) {
    return NextResponse.json(
      { ok: false, error: "Сервис недоступен." },
      { status: 500 }
    );
  }

  let password = "";
  try {
    const body = await req.json();
    password = typeof body?.password === "string" ? body.password : "";
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  if (!safeEqual(password, expected)) {
    registerFail(ip, MAX_ATTEMPTS, BLOCK_MS);
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  // Успех — снимаем счётчик неудач и ставим cookie.
  resetFails(ip);
  const hash = await sha256Hex(password);
  const res = NextResponse.json({ ok: true });
  res.cookies.set(AUTH_COOKIE, hash, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30, // ~30 дней
  });
  return res;
}
