"use client";

import type { CalcInputs, Prices, WallItem, OpeningItem } from "@/lib/calc";
import { fmtNum } from "@/lib/calc";
import PriceSettings from "./PriceSettings";

interface Props {
  inputs: CalcInputs;
  onInputs: (next: CalcInputs) => void;
  prices: Prices;
  onPrices: (next: Prices) => void;
  onResetPrices: () => void;
}

// Числовой мини-инпут для строк списков
function NumCell({
  value,
  onChange,
  placeholder,
}: {
  value: number;
  onChange: (n: number) => void;
  placeholder?: string;
}) {
  return (
    <input
      type="number"
      inputMode="decimal"
      min={0}
      step={0.1}
      value={Number.isFinite(value) && value !== 0 ? value : ""}
      placeholder={placeholder ?? "0"}
      onChange={(e) => {
        const n = Number(e.target.value);
        onChange(Number.isFinite(n) ? n : 0);
      }}
      className="tnum w-full rounded-lg border border-line bg-canvas px-2.5 py-2 text-sm font-semibold text-ink outline-none transition placeholder:text-muted/40 focus:border-gold focus:ring-2 focus:ring-gold/30"
    />
  );
}

function RemoveBtn({
  onClick,
  disabled,
}: {
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={disabled ? "Нельзя удалить последнюю" : "Удалить"}
      className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-line text-muted transition hover:border-red-400/60 hover:text-red-400 disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:border-line disabled:hover:text-muted"
    >
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M18 6 6 18M6 6l12 12" />
      </svg>
    </button>
  );
}

function AddBtn({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="mt-2 inline-flex items-center gap-1.5 rounded-lg border border-gold/50 px-3 py-1.5 text-xs font-bold text-gold transition hover:border-gold hover:bg-gold/10"
    >
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
        <path d="M12 5v14M5 12h14" />
      </svg>
      {label}
    </button>
  );
}

export default function ParamsPanel({
  inputs,
  onInputs,
  prices,
  onPrices,
  onResetPrices,
}: Props) {
  const { wallList, openingList } = inputs;

  // ── Стены ──
  const setWall = (i: number, patch: Partial<WallItem>) => {
    const next = wallList.map((w, idx) => (idx === i ? { ...w, ...patch } : w));
    onInputs({ ...inputs, wallList: next });
  };
  const addWall = () =>
    onInputs({ ...inputs, wallList: [...wallList, { height: 0, length: 0 }] });
  const removeWall = (i: number) => {
    if (wallList.length <= 1) return; // минимум 1 стена
    onInputs({ ...inputs, wallList: wallList.filter((_, idx) => idx !== i) });
  };

  // ── Окна / двери ──
  const setOpening = (i: number, patch: Partial<OpeningItem>) => {
    const next = openingList.map((o, idx) => (idx === i ? { ...o, ...patch } : o));
    onInputs({ ...inputs, openingList: next });
  };
  const addOpening = () =>
    onInputs({
      ...inputs,
      openingList: [...openingList, { width: 1.5, height: 1.5 }],
    });
  const removeOpening = (i: number) =>
    onInputs({
      ...inputs,
      openingList: openingList.filter((_, idx) => idx !== i),
    });

  const wallArea = wallList.reduce(
    (s, w) => s + (w.height || 0) * (w.length || 0),
    0
  );
  const openingsArea = openingList.reduce(
    (s, o) => s + (o.width || 0) * (o.height || 0),
    0
  );

  return (
    <div className="rounded-2xl border border-line bg-surface p-5 shadow-card sm:p-6">
      <h2 className="mb-5 flex items-center gap-2.5 text-lg font-bold text-ink">
        <span className="h-5 w-1 rounded-full bg-gradient-to-b from-gold to-goldLight" />
        Параметры объекта
      </h2>

      {/* ── Стены ── */}
      <div className="mb-5">
        <div className="mb-2 flex items-baseline justify-between">
          <span className="text-sm font-semibold text-ink">Стены</span>
          <span className="tnum text-xs text-muted">
            Σ {fmtNum(wallArea)} м²
          </span>
        </div>
        <div className="space-y-2">
          {wallList.map((w, i) => (
            <div key={i} className="flex items-center gap-2">
              <span className="w-5 shrink-0 text-xs text-muted">{i + 1}</span>
              <NumCell value={w.height} onChange={(n) => setWall(i, { height: n })} placeholder="высота" />
              <span className="text-xs text-muted">×</span>
              <NumCell value={w.length} onChange={(n) => setWall(i, { length: n })} placeholder="длина" />
              <RemoveBtn onClick={() => removeWall(i)} disabled={wallList.length <= 1} />
            </div>
          ))}
        </div>
        <div className="mt-1 flex items-center gap-2 pl-7 text-[11px] text-muted">
          <span className="w-full">высота, м</span>
          <span className="w-full">длина, м</span>
          <span className="w-8" />
        </div>
        <AddBtn label="Стена" onClick={addWall} />
      </div>

      {/* ── Окна / двери ── */}
      <div className="mb-5">
        <div className="mb-2 flex items-baseline justify-between">
          <span className="text-sm font-semibold text-ink">
            Окна / двери{" "}
            <span className="font-normal text-muted">({openingList.length})</span>
          </span>
          <span className="tnum text-xs text-muted">
            Σ {fmtNum(openingsArea)} м²
          </span>
        </div>
        {openingList.length > 0 && (
          <div className="space-y-2">
            {openingList.map((o, i) => (
              <div key={i} className="flex items-center gap-2">
                <span className="w-5 shrink-0 text-xs text-muted">{i + 1}</span>
                <NumCell value={o.width} onChange={(n) => setOpening(i, { width: n })} placeholder="ширина" />
                <span className="text-xs text-muted">×</span>
                <NumCell value={o.height} onChange={(n) => setOpening(i, { height: n })} placeholder="высота" />
                <RemoveBtn onClick={() => removeOpening(i)} />
              </div>
            ))}
          </div>
        )}
        {openingList.length > 0 && (
          <div className="mt-1 flex items-center gap-2 pl-7 text-[11px] text-muted">
            <span className="w-full">ширина, м</span>
            <span className="w-full">высота, м</span>
            <span className="w-8" />
          </div>
        )}
        <AddBtn label="Окно / дверь" onClick={addOpening} />
      </div>

      {/* ── Фундамент + углы ── */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-muted">Площадь фундамента</span>
          <div className="relative">
            <input
              type="number"
              inputMode="decimal"
              min={0}
              step={0.1}
              value={
                Number.isFinite(inputs.foundationArea) && inputs.foundationArea !== 0
                  ? inputs.foundationArea
                  : ""
              }
              placeholder="0"
              onChange={(e) => {
                const n = Number(e.target.value);
                onInputs({ ...inputs, foundationArea: Number.isFinite(n) ? n : 0 });
              }}
              className="tnum w-full rounded-xl border border-line bg-canvas px-3.5 py-2.5 pr-12 text-base font-semibold text-ink outline-none transition placeholder:text-muted/40 focus:border-gold focus:ring-2 focus:ring-gold/30"
            />
            <span className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-xs text-muted">
              м²
            </span>
          </div>
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-muted">Углы</span>
          <div className="relative">
            <input
              type="number"
              inputMode="decimal"
              min={0}
              step={0.1}
              value={
                Number.isFinite(inputs.cornersMeters) && inputs.cornersMeters !== 0
                  ? inputs.cornersMeters
                  : ""
              }
              placeholder="0"
              onChange={(e) => {
                const n = Number(e.target.value);
                onInputs({ ...inputs, cornersMeters: Number.isFinite(n) ? n : 0 });
              }}
              className="tnum w-full rounded-xl border border-line bg-canvas px-3.5 py-2.5 pr-12 text-base font-semibold text-ink outline-none transition placeholder:text-muted/40 focus:border-gold focus:ring-2 focus:ring-gold/30"
            />
            <span className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-xs text-muted">
              м
            </span>
          </div>
        </label>
      </div>

      <div className="mt-4">
        <PriceSettings prices={prices} onChange={onPrices} onReset={onResetPrices} />
      </div>
    </div>
  );
}
