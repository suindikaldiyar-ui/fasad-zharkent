// ════════════════════════════════════════════════════════════════
//  💰 ВСЕ ЦЕНЫ И НОРМЫ РАСХОДА — В ОДНОМ ФАЙЛЕ
//  Меняешь число здесь → смета пересчитывается сразу. Больше нигде не трогать.
//  (Цены декора per-метр — в lib/decor.ts, т.к. они на каждый элемент отдельно.)
// ════════════════════════════════════════════════════════════════

// ─────────────────────────────────────────────
//  1) ЦЕНЫ, тг  (это же значения по умолчанию в панели «Настройка цен»)
// ─────────────────────────────────────────────
export interface Prices {
  termopanelPricePerM2: number; // термопанель, тг/м²
  travertinePerBucket: number; // травертин, тг/ведро (20 кг)
  lacquerPerCan: number; // лак, тг/банка (10 кг)
  framingPerMeter: number; // обрамление окон, тг/м
  cornerPerMeter: number; // углы, тг/м
  foundationMaterialPerM2: number; // фундамент: материал, тг/м²
  foundationPaintPerM2: number; // фундамент: краска, тг/м²
  // ── Расходные материалы (нормы — ниже в CONSUMABLES, тут только ЦЕНЫ) ──
  gluePerBag: number; // клей, тг/мешок
  sealantPerPiece: number; // герметик, тг/шт
  primerPerPiece: number; // грунтовка, тг/шт
  foamGluePerPiece: number; // пеноклей, тг/шт
}

export const DEFAULT_PRICES: Prices = {
  termopanelPricePerM2: 3200, // ← термопанель, тг/м²
  travertinePerBucket: 9000, // ← травертин, тг/ведро
  lacquerPerCan: 22000, // ← лак, тг/банка
  framingPerMeter: 2500, // ← обрамление окон, тг/м
  cornerPerMeter: 3500, // ← углы, тг/м
  foundationMaterialPerM2: 3800, // ← фундамент: материал, тг/м²
  foundationPaintPerM2: 1500, // ← фундамент: краска, тг/м²
  // Расходники — плейсхолдеры, редактируются в панели «Настройка цен»
  gluePerBag: 0, // ← клей, тг/мешок
  sealantPerPiece: 0, // ← герметик, тг/шт
  primerPerPiece: 0, // ← грунтовка, тг/шт
  foamGluePerPiece: 0, // ← пеноклей, тг/шт
};

// ─────────────────────────────────────────────
//  2) НОРМЫ РАСХОДА  (сколько материала на площадь/окно)
//     Меняй, только если реально изменились нормы поставщика.
// ─────────────────────────────────────────────
export const NORMS = {
  // Клей — норма перенесена в CONSUMABLES (1 мешок на 2.5 м²), старая 8 м²/мешок удалена.
  TRAVERTINE_M2_PER_BUCKET: 10, // 20 кг = 1 ведро = 10 м²
  LACQUER_M2_PER_CAN: 66, // 10 кг = 66 м²
  LACQUER_KG_PER_CAN: 10, // 1 банка = 10 кг (для показа ≈ кг)
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
