# Fasad Group — калькулятор фасада + AI-визуализация

Веб-приложение для компании **Fasad Group**: расчёт сметы фасада
и AI-визуализация дома по фото (Gemini). Доступ — под паролем.

## Стек
- Next.js 14 (App Router) + TypeScript + Tailwind CSS
- AI-визуализация: Google Gemini (`gemini-3.1-flash-image`), роут `/api/visualize` (`runtime = "nodejs"`)
- Деплой: Vercel

## Запуск
```bash
npm install
cp .env.local.example .env.local   # впишите GEMINI_API_KEY (и пароль при желании)
npm run dev
```
Откройте http://localhost:3000 · пароль по умолчанию — `zharkent2026`.

## Переменные окружения (`.env.local`)
| Переменная | Описание |
|---|---|
| `GEMINI_API_KEY` | Ключ Google Gemini (https://aistudio.google.com/apikey) |
| `GEMINI_IMAGE_MODEL` | Модель генерации (по умолчанию `gemini-3.1-flash-image`) |
| `SITE_PASSWORD` | Пароль доступа ко всему сайту (по умолчанию `zharkent2026`) |
| `NEXT_PUBLIC_SUPABASE_URL` / `..._ANON_KEY` / `SUPABASE_SERVICE_ROLE_KEY` | Supabase (плейсхолдеры) |

> Калькулятор работает без Gemini-ключа. Ключ нужен только для AI-визуализации.

## 💰 Цены — всё в одном файле
Все цены и нормы расхода — в **`lib/prices.ts`**. Открыл, поменял число, сохранил —
смета пересчитывается сразу. Больше нигде цены не трогаем.
Цены на декор (за метр, отдельно на элемент) — в `lib/decor.ts`.

Нормы расхода (по умолчанию): клей 25 кг = 8 м², травертин 20 кг = 10 м²,
лак 10 кг = 66 м², обрамление 1 окно = 8 м, затирка — 🎁 бонус (бесплатно).

## 🖼 Фото-референсы материалов
Лежат в **`public/references/<материал>/<id>.jpg`** (см. `public/references/README.md`).
Имя файла = `id` из соответствующего каталога в `lib/` (`foundations.ts`, `frames.ts`, …).
Нет фото → показывается swatch, а Gemini получает текстовую подсказку.

⚠️ В один запрос к Gemini уходит максимум **4 фото-референса**
(`MAX_REFERENCE_IMAGES` в `app/api/visualize/route.ts`) — иначе модель галлюцинирует.

## Структура
```
app/
  layout.tsx              шрифт Manrope, метаданные
  page.tsx                главная: header + 2 колонки + визуализация
  login/page.tsx          вход по паролю
  globals.css             тема, печать
  api/visualize/route.ts  Gemini (nodejs runtime) + CRITICAL STRUCTURAL LOCK промпт
  api/login/route.ts      проверка пароля
components/
  ParamsPanel.tsx         инпуты (стены, окна, фундамент, углы) + настройка цен
  PriceSettings.tsx       раскрывающаяся панель цен
  EstimatePanel.tsx       смета + итого + печать
  ClientKP.tsx            данные клиента + отправка КП в WhatsApp
  Visualizer.tsx          загрузка фото, палитра, генерация, ДО/ПОСЛЕ слайдер
lib/
  prices.ts               💰 ВСЕ цены и нормы
  calc.ts                 формулы сметы
  company.ts              контакты компании (для КП)
  foundations/frames/columns/belts/brackets/termopanels/decor/textures.ts  каталоги материалов
  image.ts                клиентское сжатие фото через canvas (фикс 413)
```

## Деплой на Vercel
Проект в корне репозитория — **Root Directory = `.`** (по умолчанию).
`vercel.json` задаёт framework-хинт (`nextjs`). Не забудьте задать переменные
окружения в настройках проекта Vercel.
