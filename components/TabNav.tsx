"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/calculator", label: "Калькулятор" },
  { href: "/catalog", label: "Каталог" },
  { href: "/visualizer", label: "AI-Визуализация" },
];

// Верхний таб-бар. Активный таб подсвечен жёлтым. Липкий сверху, удобен на телефоне.
export default function TabNav() {
  const pathname = usePathname();
  return (
    <nav className="no-print sticky top-0 z-20 border-b border-line bg-canvas/95 backdrop-blur">
      <div className="mx-auto flex max-w-6xl gap-1 px-2 sm:px-5">
        {TABS.map((t) => {
          const active = pathname === t.href || pathname.startsWith(`${t.href}/`);
          return (
            <Link
              key={t.href}
              href={t.href}
              className={`relative flex-1 whitespace-nowrap px-2 py-3 text-center text-sm font-semibold transition sm:flex-none sm:px-5 ${
                active ? "text-gold" : "text-muted hover:text-ink"
              }`}
            >
              {t.label}
              {active && (
                <span className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-gold sm:inset-x-3" />
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
