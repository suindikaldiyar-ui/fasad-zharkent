// ════════════════════════════════════════════════════════════════
//  Генератор манифеста категории «АМК» (build-time, для Vercel).
//  Сканирует public/references/amk/ и пишет lib/amk.ts со списком
//  материалов. Название карточки берётся ИЗ ИМЕНИ ФАЙЛА.
//
//  Запускается автоматически перед build и dev (npm-скрипты prebuild/predev).
//  Новый файл в папке → появляется в каталоге сам, название — из имени.
//
//  Правило имени:
//    kirpich100.jpg / kirpich-100.jpg → «Кирпич 100»
//    kirpich001.jpg                   → «Кирпич 001»
//    amk-001.jpg / amk001.jpg         → «АМК 001»
//  (дефис/подчёркивание → пробел; буквы и цифры разделяются пробелом;
//   kirpich→Кирпич, amk→АМК, miks→Микс; прочие слова — с заглавной)
// ════════════════════════════════════════════════════════════════
import { readdirSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";

const AMK_DIR = join(process.cwd(), "public", "references", "amk");
const OUT_FILE = join(process.cwd(), "lib", "amk.ts");
const IMG_RE = /\.(jpe?g|png|webp)$/i;

// Словарь известных префиксов → человекочитаемое название.
const WORD_MAP = {
  kirpich: "Кирпич",
  amk: "АМК",
  miks: "Микс",
};

// id (имя файла без расширения) → название карточки.
function prettify(base) {
  const s = base
    .toLowerCase()
    .replace(/[-_]+/g, " ") // дефис/подчёркивание → пробел
    .replace(/([a-zа-яё])(\d)/gi, "$1 $2") // буква→цифра: kirpich100 → kirpich 100
    .replace(/(\d)([a-zа-яё])/gi, "$1 $2"); // цифра→буква
  return s
    .split(/\s+/)
    .filter(Boolean)
    .map((tok) => {
      if (WORD_MAP[tok]) return WORD_MAP[tok];
      if (/^\d+$/.test(tok)) return tok; // число оставляем как есть
      return tok.charAt(0).toUpperCase() + tok.slice(1);
    })
    .join(" ");
}

const files = existsSync(AMK_DIR)
  ? readdirSync(AMK_DIR)
      .filter((f) => IMG_RE.test(f))
      .sort((a, b) => a.localeCompare(b, "en", { numeric: true }))
  : [];

const items = files.map((file) => {
  const id = file.replace(IMG_RE, "");
  return { id, name: prettify(id), image: `/references/amk/${file}` };
});

const body = `// ⚠️ АВТОГЕНЕРАЦИЯ — НЕ РЕДАКТИРОВАТЬ ВРУЧНУЮ.
// Файл создаётся scripts/generate-amk-manifest.mjs (npm prebuild / predev)
// из содержимого public/references/amk/. Название карточки — из имени файла.
export type AmkItem = { id: string; name: string; image: string };

export const AMK: AmkItem[] = ${JSON.stringify(items, null, 2)};
`;

writeFileSync(OUT_FILE, body, "utf8");
console.log(`[amk-manifest] ${items.length} материалов → lib/amk.ts`);
