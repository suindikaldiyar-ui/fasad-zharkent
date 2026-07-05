// Каталог межэтажных поясов (горизонтальный декоративный профиль между этажами).
// Фото-референс для Gemini. Влияет ТОЛЬКО на визуализацию (на смету не влияет).
export type BeltItem = {
  id: string;
  name: string;
  size: string; // размер профиля, напр. "20×7 см"
  image: string; // "/references/belts/{id}.jpg"
  hint: string;
};

export const BELTS: BeltItem[] = [
  {
    id: "belt1",
    name: "КА-22",
    size: "20×7 см",
    image: "/references/belts/belt1.jpg",
    hint: "horizontal decorative inter-floor belt/molding profile, like the reference image",
  },
  {
    id: "belt2",
    name: "КА-22",
    size: "25×8 см",
    image: "/references/belts/belt2.jpg",
    hint: "horizontal decorative inter-floor belt/molding profile, like the reference image",
  },
  {
    id: "belt3",
    name: "КА-22",
    size: "30×10 см",
    image: "/references/belts/belt3.jpg",
    hint: "horizontal decorative inter-floor belt/molding profile, like the reference image",
  },
  {
    id: "belt4",
    name: "КА-23",
    size: "24.5×7 см",
    image: "/references/belts/belt4.jpg",
    hint: "horizontal decorative inter-floor belt/molding profile, like the reference image",
  },
  {
    id: "belt5",
    name: "КА-24",
    size: "29.5×14 см",
    image: "/references/belts/belt5.jpg",
    hint: "horizontal decorative inter-floor belt/molding profile, like the reference image",
  },
];

export const getBelt = (id?: string | null) =>
  id ? BELTS.find((b) => b.id === id) : undefined;
