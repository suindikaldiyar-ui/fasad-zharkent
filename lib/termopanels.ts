// Каталог термопанельных планок (ставятся вокруг окон). Фото-референс для Gemini.
// Отдельная категория, не оконное обрамление. Влияет ТОЛЬКО на визуализацию.
export type TermopanelItem = {
  id: string;
  name: string;
  size: string;
  image: string; // "/references/termopanels/{id}.jpg"
  color: string;
  hint: string;
};

export const TERMOPANELS: TermopanelItem[] = [
  {
    id: "tp25",
    name: "КА-25",
    size: "30×3 см",
    image: "/references/termopanels/tp25.jpg",
    color: "white",
    hint: "flat thin white thermopanel plank trim around the window, like the reference image",
  },
  {
    id: "tp26",
    name: "КА-26",
    size: "40×3 см",
    image: "/references/termopanels/tp26.jpg",
    color: "white",
    hint: "flat thin white thermopanel plank trim around the window, like the reference image",
  },
];

export const getTermopanel = (id?: string | null) =>
  id ? TERMOPANELS.find((t) => t.id === id) : undefined;
