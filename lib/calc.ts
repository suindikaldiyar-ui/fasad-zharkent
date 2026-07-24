// ──────────────────────────────────────────
// Расчёт сметы фасада
// ──────────────────────────────────────────
// ⚠️  ВСЕ ЦЕНЫ и НОРМЫ живут в lib/prices.ts — там их и меняем.
import { getDecor, type DecorItem } from "./decor";
import { NORMS, DEFAULT_PRICES, CONSUMABLES, type Prices } from "./prices";

// Ре-экспорт для обратной совместимости: старые импорты из "@/lib/calc" работают.
export { NORMS, DEFAULT_PRICES, CONSUMABLES };
export type { Prices };

// Стена: высота × длина
export interface WallItem {
  height: number;
  length: number;
}

// Окно/дверь: ширина × высота
export interface OpeningItem {
  width: number;
  height: number;
}

// Входные параметры калькулятора
export interface CalcInputs {
  wallList: WallItem[]; // стены — каждая вводится отдельно
  openingList: OpeningItem[]; // окна/двери — каждое отдельно
  foundationArea: number; // площадь фундамента, м² (вводится напрямую)
  cornersMeters: number; // углы, метраж (м), вводится вручную
}

export interface LineItem {
  key: string;
  name: string;
  detail: string; // расход / количество с единицами
  unitLabel: string; // подпись цены за единицу
  unitPrice: number;
  total: number;
  bonus?: boolean;
}

export interface Estimate {
  items: LineItem[];
  consumables: LineItem[]; // расходники (клей/герметик/грунтовка/пеноклей) — отдельным блоком
  consumablesTotal: number; // сумма расходников (входит в total)
  total: number;
  pricePerM2: number;
  // Площади (для отображения и КП)
  panelArea: number; // чистая площадь термопанели (стены − окна)
  foundationArea: number; // площадь фундамента
  totalArea: number; // общая площадь = panelArea + foundationArea
  perimeter: number; // периметр, м (сумма длин стен)
  wallArea: number; // площадь стен (до вычета окон)
  openingsArea: number; // площадь окон/дверей
  wallAreas: number[]; // площадь каждой стены (разбивка)
  openingsCount: number; // кол-во окон/дверей (для обрамления)
}

const ceil = (n: number) => Math.ceil(n);
const round = (n: number) => Math.round(n);

// Метраж декора по категории
function decorMeters(
  category: DecorItem["category"],
  windows: number,
  corners: number,
  perimeter: number
): number {
  switch (category) {
    case "obramlenie":
      return windows * NORMS.FRAMING_M_PER_WINDOW; // окна × 8
    case "pilyastra":
      return corners * NORMS.PILASTER_M_PER_CORNER; // углы × 3
    case "karniz":
      return perimeter; // периметр
  }
}

export function calculate(
  inputs: CalcInputs,
  prices: Prices,
  foundationId?: string | null,
  decorIds?: string[]
): Estimate {
  const wallList = inputs.wallList ?? [];
  const openingList = inputs.openingList ?? [];
  const foundationArea = Math.max(0, inputs.foundationArea || 0);
  const cornersMeters = Math.max(0, inputs.cornersMeters || 0);
  const windows = openingList.length; // кол-во окон = число строк списка

  // Площадь каждой стены и суммарная
  const wallAreas = wallList.map(
    (w) => Math.max(0, w.height || 0) * Math.max(0, w.length || 0)
  );
  const wallArea = wallAreas.reduce((s, a) => s + a, 0);

  // Площадь окон/дверей
  const openingsArea = openingList.reduce(
    (s, o) => s + Math.max(0, o.width || 0) * Math.max(0, o.height || 0),
    0
  );

  // Периметр = сумма длин всех стен (используется в декоре-карнизе и КП)
  const perimeter = wallList.reduce((s, w) => s + Math.max(0, w.length || 0), 0);

  const panelArea = Math.max(0, wallArea - openingsArea);
  const totalArea = panelArea + foundationArea;

  const items: LineItem[] = [];

  // 1. Стена = panelArea × цена (чистая площадь: стены − окна)
  items.push({
    key: "panel",
    name: "Стена",
    detail: `${fmtNum(panelArea)} м² (стены ${fmtNum(wallArea)} − окна ${fmtNum(openingsArea)})`,
    unitLabel: "тг/м²",
    unitPrice: prices.wallPricePerM2,
    total: round(panelArea * prices.wallPricePerM2),
  });

  // 2. Клей — в блоке «Расходные материалы» (норма 1 мешок на 2.5 м², см. CONSUMABLES).
  // 3. Травертин — удалён из сметы.
  // 4. Лак — удалён из сметы.

  // 5. Обрамление = окна × 8 м (БАЗОВАЯ строка — остаётся всегда)
  const framingMeters = windows * NORMS.FRAMING_M_PER_WINDOW;
  items.push({
    key: "framing",
    name: "Обрамление окон",
    detail: `${fmtNum(framingMeters)} м (${windows} ${plural(windows, "окно", "окна", "окон")})`,
    unitLabel: "тг/м",
    unitPrice: prices.framingPerMeter,
    total: round(framingMeters * prices.framingPerMeter),
  });

  // 5.1 Декор (мультивыбор) — отдельная строка за каждый выбранный элемент.
  for (const id of decorIds ?? []) {
    const decor = getDecor(id);
    if (!decor) continue;
    const meters = decorMeters(decor.category, windows, cornersMeters, perimeter);
    items.push({
      key: `decor-${decor.id}`,
      name: decor.name,
      detail: `${fmtNum(meters)} м`,
      unitLabel: "тг/м",
      unitPrice: decor.pricePerM,
      total: round(meters * decor.pricePerM),
    });
  }

  // 6. Углы = метраж углов × цена/метр
  items.push({
    key: "corners",
    name: "Углы",
    detail: `${fmtNum(cornersMeters)} м`,
    unitLabel: "тг/м",
    unitPrice: prices.cornerPerMeter,
    total: round(cornersMeters * prices.cornerPerMeter),
  });

  // 7. Фундамент = foundationArea × (материал + краска). ВСЕГДА базовый расчёт.
  //    Выбор цоколя из каталога влияет ТОЛЬКО на визуализацию, не на смету.
  const foundationPerM2 =
    prices.foundationMaterialPerM2 + prices.foundationPaintPerM2;
  items.push({
    key: "foundation",
    name: "Фундамент",
    detail:
      `${fmtNum(foundationArea)} м² · ` +
      `(${fmtNum(prices.foundationMaterialPerM2)} + ${fmtNum(prices.foundationPaintPerM2)}) тг/м²`,
    unitLabel: "тг/м²",
    unitPrice: foundationPerM2,
    total: round(foundationArea * foundationPerM2),
  });

  // 8. Затирка — удалена из сметы.

  // ── Расходные материалы ──
  // Считаем от УЖЕ посчитанной площади стен (panelArea = стены − окна/двери),
  // заново площадь не пересчитываем. Количество — всегда ceil (вверх).
  // Нормы и цены — в lib/prices.ts (CONSUMABLES).
  const consumables: LineItem[] = CONSUMABLES.map((c) => {
    const qty = ceil(panelArea / c.m2PerUnit);
    // Цена берётся из настроек (панель «Настройка цен»), норма — из CONSUMABLES.
    const unitPrice = Math.max(0, prices[c.priceKey] || 0);
    return {
      key: c.key,
      name: c.name,
      detail:
        `${qty} ${plural(qty, c.unitOne, c.unitFew, c.unitMany)} · ` +
        `норма 1 на ${fmtNum(c.m2PerUnit)} м²`,
      unitLabel: c.unitLabel,
      unitPrice,
      total: round(qty * unitPrice), // цена 0 → 0, итог не ломает
    };
  });
  const consumablesTotal = consumables.reduce((s, it) => s + it.total, 0);

  const total =
    items.reduce((sum, it) => sum + it.total, 0) + consumablesTotal;
  const pricePerM2 = totalArea > 0 ? round(total / totalArea) : 0;

  return {
    items,
    consumables,
    consumablesTotal,
    total,
    pricePerM2,
    panelArea,
    foundationArea,
    totalArea,
    perimeter,
    wallArea,
    openingsArea,
    wallAreas,
    openingsCount: windows,
  };
}

// ── Форматирование ──
export function fmtMoney(n: number): string {
  return new Intl.NumberFormat("ru-RU").format(Math.round(n)) + " ₸";
}

export function fmtNum(n: number): string {
  return new Intl.NumberFormat("ru-RU", { maximumFractionDigits: 2 }).format(n);
}

// Русские склонения
function plural(n: number, one: string, few: string, many: string): string {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return one;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return few;
  return many;
}
