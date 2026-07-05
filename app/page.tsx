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
      {/* Header */}
      <header className="border-b border-line bg-stone text-ink">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-5">
          <div className="flex items-center gap-3">
            {/* Монограмма-логотип: жёлтая плашка «FZ» */}
            <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-gold to-goldLight text-base font-extrabold tracking-tight text-stone shadow-gold">
              FZ
            </span>
            <div className="min-w-0">
              <h1 className="truncate text-lg font-extrabold leading-tight tracking-tight">
                Fasad Zharkent
              </h1>
              <p className="truncate text-xs text-muted">
                Калькулятор фасада · AI-визуализация
              </p>
            </div>
          </div>
          <span className="hidden rounded-full border border-gold/40 px-3 py-1 text-xs text-gold sm:block">
            г. Жаркент · фасады и термопанели
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
