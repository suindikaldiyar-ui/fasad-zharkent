// ⚠️ АВТОГЕНЕРАЦИЯ — НЕ РЕДАКТИРОВАТЬ ВРУЧНУЮ.
// Файл создаётся scripts/generate-manifests.mjs (npm prebuild / predev).
export type PanelItem = { id: string; name: string; shape: string; file: string; image: string };

export const PANELS: PanelItem[] = [
  {
    "id": "klinker",
    "name": "Клинкер",
    "shape": "klinker",
    "file": "klinker",
    "image": "/references/klinker/klinker.jpg"
  },
  {
    "id": "3d-panel",
    "name": "3D-панель",
    "shape": "3d-panel",
    "file": "3d-panel",
    "image": "/references/3d-panel/3d-panel.jpg"
  },
  {
    "id": "rust",
    "name": "Руст",
    "shape": "rust",
    "file": "rust",
    "image": "/references/rust/rust.jpg"
  },
  {
    "id": "labirint",
    "name": "Лабиринт",
    "shape": "labirint",
    "file": "labirint",
    "image": "/references/labirint/labirint.jpg"
  }
];
