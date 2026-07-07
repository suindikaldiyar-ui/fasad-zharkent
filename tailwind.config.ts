import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // ──────────────────────────────────────────────
        // Fasad Group — премиум: чёрный фон + светло-жёлтый акцент
        // ──────────────────────────────────────────────
        canvas: "#0A0A0A", // фон страницы (чёрный)
        surface: "#161616", // карточки/панели
        line: "#2A2A2A", // тонкие рамки/разделители
        ink: "#F5F5F5", // основной текст (почти белый)
        muted: "#A1A1A1", // приглушённый текст
        gold: "#FDE047", // основной акцент (светло-жёлтый)
        goldLight: "#FACC15", // ховер / хайлайты / градиент (насыщённее)
        bonus: "#34D399", // бонус-метка (мягкая зелёная)
        stone: "#1C1C1C", // тёмная плашка (header/кнопки) + тёмный текст на жёлтом
        // legacy-алиас: старые классы `terracotta` (в визуализаторе) → жёлтый
        terracotta: "#FDE047",
      },
      fontFamily: {
        sans: ["var(--font-manrope)", "system-ui", "sans-serif"],
      },
      boxShadow: {
        // мягкая тень под тёмную тему
        card: "0 1px 2px rgba(0,0,0,0.5), 0 12px 32px rgba(0,0,0,0.45)",
        gold: "0 8px 28px rgba(253,224,71,0.22)",
      },
    },
  },
  plugins: [],
};

export default config;
