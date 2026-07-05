import { NextRequest, NextResponse } from "next/server";
import { sha256Hex, AUTH_COOKIE } from "@/lib/auth";

// Site-wide gate: пускаем только с валидной cookie site_auth (= SHA-256 пароля).
export async function middleware(req: NextRequest) {
  const password = process.env.SITE_PASSWORD;
  const cookie = req.cookies.get(AUTH_COOKIE)?.value;

  if (password && cookie) {
    const expected = await sha256Hex(password);
    if (cookie === expected) {
      return NextResponse.next();
    }
  }

  // нет/невалидна cookie → на страницу входа
  const url = req.nextUrl.clone();
  url.pathname = "/login";
  url.search = `?from=${encodeURIComponent(req.nextUrl.pathname)}`;
  return NextResponse.redirect(url);
}

// Исключаем страницу входа, её API и всю статику — иначе цикл редиректов.
// ВАЖНО: /api/visualize НЕ исключён — он за паролем (без cookie → редирект на
// /login, Gemini не вызывается). Это основная защита API; rate limit в самом
// роуте — вторая линия на случай утечки cookie/сессии.
export const config = {
  matcher: [
    "/((?!login|api/login|_next/static|_next/image|references|favicon.ico|robots.txt|sitemap.xml).*)",
  ],
};
