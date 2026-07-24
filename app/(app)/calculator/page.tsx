"use client";

import { useMemo, useState } from "react";
import { calculate, type CalcInputs } from "@/lib/calc";
import { usePrices } from "@/lib/usePrices";
import ParamsPanel from "@/components/ParamsPanel";
import EstimatePanel from "@/components/EstimatePanel";
import ClientKP from "@/components/ClientKP";

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

export default function CalculatorPage() {
  const [inputs, setInputs] = useState<CalcInputs>(INITIAL_INPUTS);
  // Цены живут в localStorage: введённые сохраняются между сессиями.
  const { prices, setPrices, resetPrices } = usePrices();

  // Цоколь/декор из каталога на смету не влияют (см. lib/calc.ts) → передаём пусто.
  const estimate = useMemo(
    () => calculate(inputs, prices, null, []),
    [inputs, prices]
  );

  return (
    <div className="space-y-6">
      {/* 2 колонки: Параметры | Смета */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <ParamsPanel
          inputs={inputs}
          onInputs={setInputs}
          prices={prices}
          onPrices={setPrices}
          onResetPrices={resetPrices}
        />
        <EstimatePanel estimate={estimate} />
      </div>

      {/* Данные клиента + отправка КП в WhatsApp */}
      <ClientKP estimate={estimate} />
    </div>
  );
}
