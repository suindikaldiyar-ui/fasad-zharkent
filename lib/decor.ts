// Каталог декора фасада (мультивыбор: наличник + пилястры + карниз).
// Влияет на визуализацию и смету. Пока пусто — записи добавляются одной строкой.
export type DecorItem = {
  id: string;
  name: string;
  image: string; // "/references/decor/{id}.jpg"
  swatch: string;
  hint: string; // для Gemini, напр. "light cream flat window trim / pilasters"
  category: "obramlenie" | "pilyastra" | "karniz"; // тип декора
  pricePerM: number; // цена за метр, тг
};

export const DECOR: DecorItem[] = [
  // пусто — заполню позже. Пример:
  // { id: "trim-classic", name: "Классик наличник", image: "/references/decor/trim-classic.jpg",
  //   swatch: "#EDE3D1", hint: "light cream flat window trim", category: "obramlenie", pricePerM: 2500 },
];

export const getDecor = (id?: string) => DECOR.find((d) => d.id === id);

// Человеко-читаемые метки категорий (для UI)
export const DECOR_CATEGORY_LABEL: Record<DecorItem["category"], string> = {
  obramlenie: "Обрамление",
  pilyastra: "Пилястры",
  karniz: "Карниз",
};
