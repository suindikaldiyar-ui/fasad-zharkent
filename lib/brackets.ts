// Каталог кронштейнов (декоративные консоли у окон). Фото-референс для Gemini.
// Влияет ТОЛЬКО на визуализацию (на смету не влияет).
export type BracketItem = {
  id: string;
  name: string;
  size: string;
  image: string; // "/references/brackets/{id}.jpg"
  hint: string;
};

export const BRACKETS: BracketItem[] = [
  {
    id: "bracket1",
    name: "КА-31",
    size: "43×14 см",
    image: "/references/brackets/bracket1.jpg",
    hint: "decorative facade bracket/corbel, like the reference image",
  },
  {
    id: "bracket2",
    name: "КА-32",
    size: "30×18 см",
    image: "/references/brackets/bracket2.jpg",
    hint: "decorative facade bracket/corbel, like the reference image",
  },
  {
    id: "bracket3",
    name: "КА-33",
    size: "26.5×15 см",
    image: "/references/brackets/bracket3.jpg",
    hint: "ornate carved decorative facade bracket/corbel, like the reference image",
  },
];

export const getBracket = (id?: string | null) =>
  id ? BRACKETS.find((b) => b.id === id) : undefined;
