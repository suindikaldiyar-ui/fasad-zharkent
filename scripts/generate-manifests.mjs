// ════════════════════════════════════════════════════════════════
//  Генератор манифестов категорий по папкам (build-time, для Vercel).
//  Сканирует public/references/<папка>/ и пишет lib/<name>.ts со списком
//  материалов. Название карточки берётся ИЗ ИМЕНИ ФАЙЛА.
//
//  Запускается автоматически перед build и dev (npm prebuild / predev).
//  Новый файл в папке → появляется в каталоге сам, название — из имени.
//
//  Правило имени: дефис/подчёркивание → пробел; буквы и цифры разделяются;
//  слова из wordMap заменяются (klinker→Клинкер, color→Цвет), прочие — с заглавной.
//    klinker.jpg  → «Клинкер»
//    color-01.jpg → «Цвет 01»
//
//  (Категория АМК генерируется отдельным scripts/generate-amk-manifest.mjs.)
// ════════════════════════════════════════════════════════════════
import { readdirSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";

const IMG_RE = /\.(jpe?g|png|webp)$/i;

// Что генерируем: папка в public/references → файл в lib.
const MANIFESTS = [
  {
    folder: "klinker",
    outFile: "klinker.ts",
    exportName: "KLINKER",
    typeName: "KlinkerItem",
    wordMap: { klinker: "Клинкер" },
  },
  {
    folder: "colors",
    outFile: "colors.ts",
    exportName: "COLORS",
    typeName: "ColorItem",
    wordMap: { color: "Цвет", colors: "Цвет" },
  },
];

function prettify(base, wordMap) {
  const s = base
    .toLowerCase()
    .replace(/[-_]+/g, " ")
    .replace(/([a-zа-яё])(\d)/gi, "$1 $2")
    .replace(/(\d)([a-zа-яё])/gi, "$1 $2");
  return s
    .split(/\s+/)
    .filter(Boolean)
    .map((tok) => {
      if (wordMap[tok]) return wordMap[tok];
      if (/^\d+$/.test(tok)) return tok;
      return tok.charAt(0).toUpperCase() + tok.slice(1);
    })
    .join(" ");
}

for (const m of MANIFESTS) {
  const dir = join(process.cwd(), "public", "references", m.folder);
  const files = existsSync(dir)
    ? readdirSync(dir)
        .filter((f) => IMG_RE.test(f))
        .sort((a, b) => a.localeCompare(b, "en", { numeric: true }))
    : [];

  const items = files.map((file) => {
    const id = file.replace(IMG_RE, "");
    return { id, name: prettify(id, m.wordMap), image: `/references/${m.folder}/${file}` };
  });

  const body = `// ⚠️ АВТОГЕНЕРАЦИЯ — НЕ РЕДАКТИРОВАТЬ ВРУЧНУЮ.
// Файл создаётся scripts/generate-manifests.mjs (npm prebuild / predev)
// из содержимого public/references/${m.folder}/. Название — из имени файла.
export type ${m.typeName} = { id: string; name: string; image: string };

export const ${m.exportName}: ${m.typeName}[] = ${JSON.stringify(items, null, 2)};
`;

  writeFileSync(join(process.cwd(), "lib", m.outFile), body, "utf8");
  console.log(`[manifests] ${items.length} → lib/${m.outFile}`);
}
