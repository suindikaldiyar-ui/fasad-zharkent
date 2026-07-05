// Каталог цветов травертина (миксы) для AI-визуализации
export interface Texture {
  id: string;
  name: string;
  image: string; // реальное фото текстуры (reference для Gemini + превью)
  swatch: string; // цвет swatch'а — fallback, если фото не загрузилось
  hint: string; // подсказка для Gemini-промпта — fallback, если файла нет
}

export const TEXTURES: Texture[] = [
  {
    id: "limestone",
    name: "Травертин Лаймстоун",
    image: "/references/textures/limestone.jpg",
    swatch: "#EADFCB",
    hint: "light cream limestone travertine, warm ivory tone",
  },
  {
    id: "max3d",
    name: "Травертин 3D Макс",
    image: "/references/textures/max3d.jpg",
    swatch: "#D9C7AD",
    hint: "warm beige 3D textured travertine stone",
  },
];
