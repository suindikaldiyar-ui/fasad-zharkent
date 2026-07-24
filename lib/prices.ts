// ════════════════════════════════════════════════════════════════
//  💰 ВСЕ ЦЕНЫ И НОРМЫ РАСХОДА — В ОДНОМ ФАЙЛЕ
//  Меняешь число здесь → смета пересчитывается сразу. Больше нигде не трогать.
//  (Цены декора per-метр — в lib/decor.ts, т.к. они на каждый элемент отдельно.)
// ════════════════════════════════════════════════════════════════

// ─────────────────────────────────────────────
//  1) ЦЕНЫ, тг  (это же значения по умолчанию в панели «Настройка цен»)
// ─────────────────────────────────────────────
export interface Prices {
  wallPricePerM2: number; // стена, тг/м²
  framingPerMeter: number; // обрамление окон, тг/м
  cornerPerMeter: number; // углы, тг/м
  foundationMaterialPerM2: number; // фундамент: материал, тг/м²
  foundationPaintPerM2: number; // фундамент: краска, тг/м²
  // ── Расходные материалы (нормы — ниже в CONSUMABLES, тут только ЦЕНЫ) ──
  gluePerBag: number; // клей, тг/мешок
  sealantPerPiece: number; // герметик, тг/шт
  primerPerPiece: number; // грунтовка, тг/шт
  foamGluePerPiece: number; // пеноклей, тг/шт
  // ── Краска (нормы — ниже в PAINTS, тут только ЦЕНЫ) ──
  paintBaseAPerBucket: number; // база А (стены), тг/ведро
  paintMixPerBucket: number; // микс (стены), тг/ведро
  paintBaseCPerBucket: number; // база С (фундамент), тг/ведро
}

export const DEFAULT_PRICES: Prices = {
  wallPricePerM2: 3200, // ← стена, тг/м²
  framingPerMeter: 2500, // ← обрамление окон, тг/м
  cornerPerMeter: 3500, // ← углы, тг/м
  foundationMaterialPerM2: 3800, // ← фундамент: материал, тг/м²
  foundationPaintPerM2: 1500, // ← фундамент: краска, тг/м²
  // Расходники — плейсхолдеры, редактируются в панели «Настройка цен»
  gluePerBag: 0, // ← клей, тг/мешок
  sealantPerPiece: 0, // ← герметик, тг/шт
  primerPerPiece: 0, // ← грунтовка, тг/шт
  foamGluePerPiece: 0, // ← пеноклей, тг/шт
  // Краска — плейсхолдеры, редактируются в панели «Настройка цен»
  paintBaseAPerBucket: 0, // ← база А (стены), тг/ведро
  paintMixPerBucket: 0, // ← микс (стены), тг/ведро
  paintBaseCPerBucket: 0, // ← база С (фундамент), тг/ведро
};

// ─────────────────────────────────────────────
//  2) НОРМЫ РАСХОДА  (сколько материала на площадь/окно)
//     Меняй, только если реально изменились нормы поставщика.
// ─────────────────────────────────────────────
export const NORMS = {
  // Клей — норма в CONSUMABLES (1 мешок на 2.5 м²).
  // Травертин и лак удалены из сметы — их нормы больше не нужны.
  FRAMING_M_PER_WINDOW: 8, // 1 окно = 8 м (верх + низ + 2 стороны)
  PILASTER_M_PER_CORNER: 3, // высота пилястры (упрощённо), м
} as const;

// ─────────────────────────────────────────────
//  3) РАСХОДНЫЕ МАТЕРИАЛЫ  ← НОРМА и ЦЕНА в одной строке, меняются за 10 секунд
//
//     Считаются от площади СТЕН (стены − окна/двери), та же площадь, что и панель.
//     Количество = ceil(площадь / m2PerUnit) — округление ВСЕГДА вверх.
//     price = 0 → строка всё равно видна (количество нужно замерщику),
//               в сумму добавляет 0, итог не ломает. Впиши цену — попадёт в итог.
// ─────────────────────────────────────────────
export interface Consumable {
  key: string;
  name: string;
  m2PerUnit: number; // ← НОРМА: 1 единица на N м² стен (меняется ТОЛЬКО здесь, в UI её нет)
  priceKey: keyof Prices; // ← откуда берётся ЦЕНА (панель «Настройка цен»)
  unitLabel: string; // подпись цены, напр. "тг/мешок"
  unitOne: string; // 1 мешок
  unitFew: string; // 2 мешка
  unitMany: string; // 5 мешков
}

export const CONSUMABLES: Consumable[] = [
  //                            норма          цена из Prices          подпись        склонения
  { key: "cons-glue",    name: "Клей",      m2PerUnit: 2.5, priceKey: "gluePerBag",       unitLabel: "тг/мешок", unitOne: "мешок", unitFew: "мешка", unitMany: "мешков" },
  { key: "cons-sealant", name: "Герметик",  m2PerUnit: 5,   priceKey: "sealantPerPiece",  unitLabel: "тг/шт",    unitOne: "шт",    unitFew: "шт",    unitMany: "шт" },
  { key: "cons-primer",  name: "Грунтовка", m2PerUnit: 100, priceKey: "primerPerPiece",   unitLabel: "тг/шт",    unitOne: "шт",    unitFew: "шт",    unitMany: "шт" },
  { key: "cons-foam",    name: "Пеноклей",  m2PerUnit: 40,  priceKey: "foamGluePerPiece", unitLabel: "тг/шт",    unitOne: "шт",    unitFew: "шт",    unitMany: "шт" },
];

// ─────────────────────────────────────────────
//  4) КРАСКА  ← НОРМЫ здесь (менять только тут), цены — в панели «Настройка цен»
//
//     СТЕНЫ  (area: "wall")       — База А и Микс, ОБА одновременно, от panelArea (стены − окна).
//     ФУНДАМЕНТ (area: "foundation") — только База С, от площади фундамента.
//     Количество = ceil(площадь / m2PerBucket) — округление ВСЕГДА вверх.
//     Проверка: стены 80 м² → База А 1 ведро, Микс 4; 81 м² → 2 и 5.
//               фундамент 40 м² → База С 1 ведро; 41 м² → 2.
// ─────────────────────────────────────────────
export interface Paint {
  key: string;
  name: string;
  area: "wall" | "foundation"; // от какой площади считаем
  m2PerBucket: number; // ← НОРМА: 1 ведро на N м²
  priceKey: keyof Prices; // ← откуда берётся ЦЕНА (панель «Настройка цен»)
}

export const PAINTS: Paint[] = [
  //                         площадь          норма                цена из Prices
  { key: "paint-base-a", name: "База А", area: "wall",       m2PerBucket: 80, priceKey: "paintBaseAPerBucket" },
  { key: "paint-mix",    name: "Микс",   area: "wall",       m2PerBucket: 20, priceKey: "paintMixPerBucket" },
  { key: "paint-base-c", name: "База С", area: "foundation", m2PerBucket: 40, priceKey: "paintBaseCPerBucket" },
];
