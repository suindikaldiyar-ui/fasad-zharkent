"use client";

import { useState } from "react";
import type { Prices } from "@/lib/calc";

interface Props {
  prices: Prices;
  onChange: (next: Prices) => void;
  onReset: () => void;
}

const FIELDS: { key: keyof Prices; label: string; suffix: string; locked?: boolean }[] = [
  { key: "termopanelPricePerM2", label: "Термопанель", suffix: "тг/м²" },
  { key: "travertinePerBucket", label: "Травертин", suffix: "тг/ведро" },
  { key: "lacquerPerCan", label: "Лак", suffix: "тг/банка" },
  { key: "framingPerMeter", label: "Обрамление", suffix: "тг/м" },
  { key: "cornerPerMeter", label: "Углы", suffix: "тг/м" },
  { key: "foundationMaterialPerM2", label: "Фундамент: материал", suffix: "тг/м²" },
  { key: "foundationPaintPerM2", label: "Фундамент: краска", suffix: "тг/м²" },
  // ── Расходные материалы (нормы расхода — в lib/prices.ts, тут только цены) ──
  { key: "gluePerBag", label: "Клей", suffix: "тг/мешок" },
  { key: "sealantPerPiece", label: "Герметик", suffix: "тг/шт" },
  { key: "primerPerPiece", label: "Грунтовка", suffix: "тг/шт" },
  { key: "foamGluePerPiece", label: "Пеноклей", suffix: "тг/шт" },
];

export default function PriceSettings({ prices, onChange, onReset }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <div className="rounded-xl border border-line bg-canvas no-print">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between px-4 py-3 text-left"
      >
        <span className="flex items-center gap-2 text-sm font-semibold text-ink">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-gold">
            <path d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z" />
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z" />
          </svg>
          Настройка цен
        </span>
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          className={`text-muted transition-transform ${open ? "rotate-180" : ""}`}
        >
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>

      {open && (
        <div className="border-t border-line px-4 py-4">
          <div className="grid grid-cols-2 gap-3">
            {FIELDS.map((f) => (
              <label key={f.key} className="flex flex-col gap-1">
                <span className="text-xs font-medium text-muted">
                  {f.label}
                  {f.locked && <span className="ml-1 text-gold">· фикс.</span>}
                </span>
                <div className="relative">
                  <input
                    type="number"
                    inputMode="numeric"
                    min={0}
                    value={
                      Number.isFinite(prices[f.key]) && prices[f.key] !== 0
                        ? prices[f.key]
                        : ""
                    }
                    placeholder="0"
                    disabled={f.locked}
                    onChange={(e) => {
                      const n = Number(e.target.value);
                      onChange({ ...prices, [f.key]: Number.isFinite(n) ? n : 0 });
                    }}
                    className="tnum w-full rounded-lg border border-line bg-surface px-3 py-2 pr-14 text-sm text-ink outline-none transition placeholder:text-muted/40 focus:border-gold focus:ring-2 focus:ring-gold/30 disabled:bg-canvas disabled:text-muted"
                  />
                  <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[11px] text-muted">
                    {f.suffix}
                  </span>
                </div>
              </label>
            ))}
          </div>
          <button
            type="button"
            onClick={onReset}
            className="mt-4 text-xs font-medium text-gold hover:text-goldLight hover:underline"
          >
            Сбросить к значениям по умолчанию
          </button>
        </div>
      )}
    </div>
  );
}
