// ════════════════════════════════════════════════════════════════
//  Генератор манифестов (build-time, для Vercel) — НЕ рантайм fs.readdir.
//  Запускается перед build и dev (npm prebuild / predev).
//
//  1) lib/panels.ts — ОДИН общий список ФОРМ фасада «Панели» из 4 папок:
//       public/references/{klinker,3d-panel,rust,labirint}/*.jpg
//     Каждая запись знает свою форму (shape = папка) и файл. Название — из
//     имени файла: klinker.jpg → «Клинкер», 3d-panel.jpg → «3D-панель»,
//     rust.jpg → «Руст», labirint.jpg → «Лабиринт». Вариант rust-01.jpg → «Руст 01».
//     Новый файл в любой из папок → карточка появляется сама.
//
//  2) lib/colors.ts — палитра цветов из public/references/colors/*.jpg
//       color-01.jpg → «Цвет 01».
//
//  (Категория АМК генерируется отдельным scripts/generate-amk-manifest.mjs.)
// ════════════════════════════════════════════════════════════════
import { readdirSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";

const IMG_RE = /\.(jpe?g|png|webp)$/i;

// Формы фасада (панели): папка в public/references → отображаемое имя формы.
const SHAPE_FOLDERS = [
  { folder: "klinker", form: "Клинкер" },
  { folder: "3d-panel", form: "3D-панель" },
  { folder: "rust", form: "Руст" },
  { folder: "labirint", form: "Лабиринт" },
];

const listImages = (dir) =>
  existsSync(dir)
    ? readdirSync(dir)
        .filter((f) => IMG_RE.test(f))
        .sort((a, b) => a.localeCompare(b, "en", { numeric: true }))
    : [];

// "01" → "01"; "big" → "Big"; "a-2" → "A 2"
const titleize = (s) =>
  s
    .replace(/[-_]+/g, " ")
    .split(/\s+/)
    .filter(Boolean)
    .map((t) => (/^\d+$/.test(t) ? t : t.charAt(0).toUpperCase() + t.slice(1)))
    .join(" ");

// ── 1) Панели (формы) — общий список из всех папок форм ──
const panels = [];
const seen = new Set();
for (const { folder, form } of SHAPE_FOLDERS) {
  const dir = join(process.cwd(), "public", "references", folder);
  for (const file of listImages(dir)) {
    const base = file.replace(IMG_RE, "");
    // Название: файл == форме → имя формы; "<форма>-XX" → форма + вариант; иначе форма · вариант.
    let name;
    if (base === folder) name = form;
    else if (base.startsWith(`${folder}-`)) name = `${form} ${titleize(base.slice(folder.length + 1))}`;
    else name = `${form} · ${titleize(base)}`;
    // Уникальный id: обычно = имя файла; при коллизии между папками — с префиксом папки.
    let id = base;
    if (seen.has(id)) id = `${folder}-${base}`;
    seen.add(id);
    panels.push({ id, name, shape: folder, file: base, image: `/references/${folder}/${file}` });
  }
}

// ── 2) Цвета ──
const colorMap = { color: "Цвет", colors: "Цвет" };
const colorName = (base) =>
  base
    .toLowerCase()
    .replace(/[-_]+/g, " ")
    .replace(/([a-zа-яё])(\d)/gi, "$1 $2")
    .replace(/(\d)([a-zа-яё])/gi, "$1 $2")
    .split(/\s+/)
    .filter(Boolean)
    .map((t) => colorMap[t] || (/^\d+$/.test(t) ? t : t.charAt(0).toUpperCase() + t.slice(1)))
    .join(" ");

const colors = listImages(join(process.cwd(), "public", "references", "colors")).map((file) => {
  const base = file.replace(IMG_RE, "");
  return { id: base, name: colorName(base), image: `/references/colors/${file}` };
});

const write = (outFile, typeName, exportName, tsType, items) => {
  const body = `// ⚠️ АВТОГЕНЕРАЦИЯ — НЕ РЕДАКТИРОВАТЬ ВРУЧНУЮ.
// Файл создаётся scripts/generate-manifests.mjs (npm prebuild / predev).
export type ${typeName} = ${tsType};

export const ${exportName}: ${typeName}[] = ${JSON.stringify(items, null, 2)};
`;
  writeFileSync(join(process.cwd(), "lib", outFile), body, "utf8");
  console.log(`[manifests] ${items.length} → lib/${outFile}`);
};

write(
  "panels.ts",
  "PanelItem",
  "PANELS",
  "{ id: string; name: string; shape: string; file: string; image: string }",
  panels
);
write("colors.ts", "ColorItem", "COLORS", "{ id: string; name: string; image: string }", colors);
