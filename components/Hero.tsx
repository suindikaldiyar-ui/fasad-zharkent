"use client";

import { useState } from "react";
import { COMPANY } from "@/lib/company";

// Hero-шапка: крупный логотип по центру. Общая для всех вкладок (в layout).
export default function Hero() {
  return (
    <header className="no-print border-b border-line bg-gradient-to-b from-stone to-canvas">
      <div className="mx-auto flex max-w-6xl flex-col items-center px-5 py-8 text-center sm:py-12">
        <BrandMark />
        <h1 className="mt-4 text-3xl font-extrabold tracking-tight text-ink sm:text-4xl">
          {COMPANY.name}
        </h1>
        <p className="mt-1.5 text-sm font-medium text-muted">г. {COMPANY.city}</p>
      </div>
    </header>
  );
}

// Логотип: если есть /logo.png — показываем его; иначе крупная монограмма FZ.
function BrandMark() {
  const [logoOk, setLogoOk] = useState(true);
  if (logoOk) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src="/logo.png"
        alt={COMPANY.name}
        onError={() => setLogoOk(false)}
        className="h-24 w-auto object-contain sm:h-28"
      />
    );
  }
  return (
    <span className="inline-flex h-24 w-24 items-center justify-center rounded-2xl bg-gradient-to-br from-gold to-goldLight text-4xl font-extrabold tracking-tight text-stone shadow-gold sm:h-28 sm:w-28 sm:text-5xl">
      FZ
    </span>
  );
}
