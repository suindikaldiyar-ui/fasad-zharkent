"use client";

// ════════════════════════════════════════════════════════════════
//  Хранение цен между сессиями (localStorage).
//  Замерщик вводит цены один раз — после перезагрузки они на месте.
//
//  SSR-safe: на сервере localStorage нет, поэтому стартуем с DEFAULT_PRICES,
//  а сохранённое читаем ТОЛЬКО в useEffect (на клиенте) — без hydration mismatch.
// ════════════════════════════════════════════════════════════════
import { useEffect, useState } from "react";
import { DEFAULT_PRICES, type Prices } from "./prices";

const STORAGE_KEY = "fasad-group.prices.v1";

// Склеиваем сохранённое с дефолтами:
//  • нет ключа (добавили новый расходник позже) → берём из DEFAULT_PRICES
//  • значение не число / отрицательное / битое → тоже из DEFAULT_PRICES
// Так старые сохранения не ломают приложение.
function mergeWithDefaults(raw: unknown): Prices {
  const merged: Prices = { ...DEFAULT_PRICES };
  if (raw && typeof raw === "object") {
    const src = raw as Record<string, unknown>;
    for (const key of Object.keys(DEFAULT_PRICES) as (keyof Prices)[]) {
      const v = src[key];
      if (typeof v === "number" && Number.isFinite(v) && v >= 0) {
        merged[key] = v;
      }
    }
  }
  return merged;
}

export function usePrices() {
  // Первый рендер (и сервер) — всегда дефолты: разметка сервера и клиента совпадают.
  const [prices, setPrices] = useState<Prices>(DEFAULT_PRICES);
  // Пока не прочитали localStorage — не пишем в него (иначе затрём сохранённое дефолтами).
  const [loaded, setLoaded] = useState(false);

  // 1) Восстановление на клиенте
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) setPrices(mergeWithDefaults(JSON.parse(raw)));
    } catch {
      // битый JSON / localStorage недоступен (приватный режим) — молча остаёмся на дефолтах
    }
    setLoaded(true);
  }, []);

  // 2) Автосохранение при каждом изменении цены
  useEffect(() => {
    if (!loaded) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(prices));
    } catch {
      // квота/приватный режим — не критично, просто не сохранится
    }
  }, [prices, loaded]);

  // 3) Сброс: чистим и state, и сохранённое
  const resetPrices = () => {
    try {
      window.localStorage.removeItem(STORAGE_KEY);
    } catch {
      /* ignore */
    }
    setPrices(DEFAULT_PRICES);
  };

  return { prices, setPrices, resetPrices };
}
