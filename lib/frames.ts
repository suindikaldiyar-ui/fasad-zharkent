// Каталог обрамлений окон (фото-референс для Gemini).
export type FrameItem = {
  id: string;
  name: string;
  image: string; // "/references/frames/{id}.jpg" — превью (для комплекта = боковой профиль)
  hint: string; // текст-подсказка для Gemini
  color: string; // цвет обрамления по умолчанию (человекочит.) — для промпта
  // Комплект из 3 профилей вокруг окна (боковой/верхний/нижний). Если задан —
  // это обрамление-комплект, а не одиночный референс.
  setImages?: { side: string; top: string; bottom: string };
};

export const FRAMES: FrameItem[] = [
  {
    id: "frame1",
    name: "Классика",
    image: "/references/frames/frame1.jpg",
    hint: "white classic window trim with side pilasters and top cornice, like the reference photo",
    color: "white",
  },
  {
    id: "frame2",
    name: "Классика 2",
    image: "/references/frames/frame2.jpg",
    hint: "flat window surround, like the reference photo",
    color: "dark graphite grey / charcoal",
  },
  {
    id: "frame3",
    name: "Классика 3",
    image: "/references/frames/frame3.jpg",
    hint: "classic window trim, like the reference photo",
    color: "white",
  },
  {
    id: "set-classic",
    name: "Классика (комплект)",
    image: "/references/frames/set-side.jpg",
    color: "white",
    setImages: {
      side: "/references/frames/set-side.jpg",
      top: "/references/frames/set-top.jpg",
      bottom: "/references/frames/set-bottom.jpg",
    },
    hint: "classic white window trim set: side molding, top cornice and bottom sill around the window",
  },
];

export const getFrame = (id?: string | null) =>
  id ? FRAMES.find((f) => f.id === id) : undefined;
