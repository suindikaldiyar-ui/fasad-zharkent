"use client";

import { useMemo, useState } from "react";
import {
  calculate,
  DEFAULT_PRICES,
  type CalcInputs,
  type Prices,
} from "@/lib/calc";
import ParamsPanel from "@/components/ParamsPanel";
import EstimatePanel from "@/components/EstimatePanel";
import ClientKP from "@/components/ClientKP";
import Visualizer from "@/components/Visualizer";
import { COMPANY } from "@/lib/company";

const INITIAL_INPUTS: CalcInputs = {
  wallList: [
    { height: 3.4, length: 9 },
    { height: 3.4, length: 8.5 },
    { height: 3.4, length: 9 },
    { height: 3.4, length: 8.69 },
  ],
  openingList: Array.from({ length: 8 }, () => ({ width: 1.5, height: 1.5 })),
  foundationArea: 28,
  cornersMeters: 13.6,
};

export default function Page() {
  const [inputs, setInputs] = useState<CalcInputs>(INITIAL_INPUTS);
  const [prices, setPrices] = useState<Prices>(DEFAULT_PRICES);

  // Один общий выбор для сметы И визуализатора
  const [foundationId, setFoundationId] = useState<string | null>(null);
  const [decorIds, setDecorIds] = useState<string[]>([]);

  const estimate = useMemo(
    () => calculate(inputs, prices, foundationId, decorIds),
    [inputs, prices, foundationId, decorIds]
  );

  return (
    <main className="min-h-screen">
      {/* Hero — крупный логотип по центру, над калькулятором */}
      <header className="border-b border-line bg-gradient-to-b from-stone to-canvas">
        <div className="mx-auto flex max-w-6xl flex-col items-center px-5 py-10 text-center sm:py-14">
          <BrandMark />
          <h1 className="mt-5 text-3xl font-extrabold tracking-tight text-ink sm:text-4xl">
            {COMPANY.name}
          </h1>
          <p className="mt-1.5 text-sm font-medium text-muted">г. {COMPANY.city}</p>
          <span className="mt-4 inline-flex items-center rounded-full border border-gold/40 px-4 py-1 text-xs font-medium text-gold">
            Калькулятор фасада · AI-визуализация
          </span>
        </div>
      </header>

      <div className="mx-auto max-w-6xl space-y-6 px-5 py-7">
        {/* 2 колонки: Параметры | Смета */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <ParamsPanel
            inputs={inputs}
            onInputs={setInputs}
            prices={prices}
            onPrices={setPrices}
            onResetPrices={() => setPrices(DEFAULT_PRICES)}
          />
          <EstimatePanel estimate={estimate} />
        </div>

        {/* Данные клиента + отправка КП в WhatsApp */}
        <ClientKP estimate={estimate} />

        {/* Полноширинная AI-визуализация */}
        <Visualizer
          foundationId={foundationId}
          decorIds={decorIds}
          onFoundationId={setFoundationId}
          onDecorIds={setDecorIds}
        />

        <footer className="pb-6 pt-2 text-center text-xs text-muted/60">
          Fasad Zharkent · расчёт ориентировочный, уточняется при замере
        </footer>
      </div>
    </main>
  );
}

// Логотип hero: если есть /logo.png — показываем его; иначе крупная монограмма FZ.
function BrandMark() {
  const [logoOk, setLogoOk] = useState(true);
  if (logoOk) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src="/logo.png"
        alt="Fasad Zharkent"
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
