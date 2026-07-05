// Каталог угловых колонн (пилястр на углах дома). Фото-референс для Gemini.
// Влияет ТОЛЬКО на визуализацию (на смету пока не влияет).
export type ColumnItem = {
  id: string;
  name: string;
  image: string; // "/references/columns/{id}.jpg"
  hint: string; // текст-подсказка для Gemini
};

export const COLUMNS: ColumnItem[] = [
  {
    id: "column1",
    name: "Классика",
    image: "/references/columns/column1.jpg",
    hint: "white classic corner column/pilaster with rectangular raised panels and a capital on top, like the reference image",
  },
  {
    id: "column2",
    name: "Классика 2",
    image: "/references/columns/column2.jpg",
    hint: "white fluted classic corner column with vertical grooves and a base at the bottom, like the reference image",
  },
  {
    id: "column3",
    name: "КА-36",
    image: "/references/columns/column3.jpg",
    hint: "white classic corner column/pilaster with horizontal rectangular panels, like the reference image",
  },
  {
    id: "column4",
    name: "КА-37",
    image: "/references/columns/column4.jpg",
    hint: "white fluted corner column/pilaster with vertical grooves and horizontal panels, like the reference image",
  },
  {
    id: "column5",
    name: "КА-39",
    image: "/references/columns/column5.jpg",
    hint: "white classic corner column/pilaster with panel sections, like the reference image",
  },
];

export const getColumn = (id?: string | null) =>
  id ? COLUMNS.find((c) => c.id === id) : undefined;
