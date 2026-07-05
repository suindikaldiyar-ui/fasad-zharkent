// Каталог цветов краски фасада (стен). Только визуализация, не смета.
export type FacadeColor = { id: string; name: string; swatch: string; hint: string };

export const FACADE_COLORS: FacadeColor[] = [
  { id: "none", name: "Как есть", swatch: "#CCCCCC", hint: "" },
  { id: "white", name: "Белый", swatch: "#F2EFE9", hint: "white painted facade walls" },
  {
    id: "yellow",
    name: "Жёлтый",
    swatch: "#E8D08A",
    hint: "warm yellow/sand painted facade walls",
  },
];

export const getFacadeColor = (id?: string | null) =>
  id ? FACADE_COLORS.find((c) => c.id === id) : undefined;
