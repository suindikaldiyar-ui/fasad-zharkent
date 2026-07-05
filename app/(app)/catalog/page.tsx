"use client";

import { useState } from "react";
import Link from "next/link";
import { FOUNDATIONS } from "@/lib/foundations";
import { FRAMES } from "@/lib/frames";
import { COLUMNS } from "@/lib/columns";
import { BELTS } from "@/lib/belts";
import { BRACKETS } from "@/lib/brackets";
import { TERMOPANELS } from "@/lib/termopanels";
import { DECOR, DECOR_CATEGORY_LABEL } from "@/lib/decor";
import { TEXTURES } from "@/lib/textures";
import { AMK } from "@/lib/amk";

// Нормализованная карточка каталога (единый вид для всех категорий).
type CardItem = { id: string; name: string; image: string; swatch?: string; note?: string };

// key = папка в public/references/<key>/ И параметр для /visualizer?cat=<key>
const SECTIONS: { key: string; title: string; canVisualize: boolean; items: CardItem[] }[] = [
  {
    key: "amk",
    // Названия и список генерируются из имён файлов public/references/amk/
    // (см. scripts/generate-amk-manifest.mjs → lib/amk.ts).
    title: "АМК (кирпич)",
    canVisualize: true, // материал стен → /visualizer?cat=amk&id=<id>
    items: AMK.map((a) => ({ id: a.id, name: a.name, image: a.image })),
  },
  {
    key: "termopanels",
    title: "Термопанели (материал стен)",
    canVisualize: true,
    items: TERMOPANELS.map((t) => ({ id: t.id, name: t.name, image: t.image, note: t.size })),
  },
  {
    key: "foundations",
    title: "Цоколь / фундамент",
    canVisualize: true,
    items: FOUNDATIONS.map((f) => ({ id: f.id, name: f.name, image: f.image, swatch: f.swatch })),
  },
  {
    key: "frames",
    title: "Обрамление окон",
    canVisualize: true,
    items: FRAMES.map((f) => ({
      id: f.id,
      name: f.name,
      image: f.image,
      note: f.setImages ? "комплект · 3 профиля" : undefined,
    })),
  },
  {
    key: "columns",
    title: "Угловые колонны",
    canVisualize: true,
    items: COLUMNS.map((c) => ({ id: c.id, name: c.name, image: c.image })),
  },
  {
    key: "belts",
    title: "Межэтажные пояса",
    canVisualize: true,
    items: BELTS.map((b) => ({ id: b.id, name: b.name, image: b.image, note: b.size })),
  },
  {
    key: "brackets",
    title: "Кронштейны",
    canVisualize: true,
    items: BRACKETS.map((b) => ({ id: b.id, name: b.name, image: b.image, note: b.size })),
  },
  {
    key: "decor",
    title: "Декор (наличники / пилястры / карнизы)",
    canVisualize: true,
    items: DECOR.map((d) => ({
      id: d.id,
      name: d.name,
      image: d.image,
      swatch: d.swatch,
      note: DECOR_CATEGORY_LABEL[d.category],
    })),
  },
  {
    key: "textures",
    title: "Текстуры стен",
    canVisualize: false, // текстуры не участвуют в визуализаторе
    items: TEXTURES.map((t) => ({ id: t.id, name: t.name, image: t.image, swatch: t.swatch })),
  },
];

export default function CatalogPage() {
  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-xl font-bold text-ink">Каталог материалов</h2>
        <p className="mt-1 text-sm text-muted">
          Материалы читаются из <code className="text-gold">lib/*.ts</code>, превью — из{" "}
          <code className="rounded bg-stone px-1 py-0.5 text-gold">
            public/references/&lt;категория&gt;/&lt;id&gt;.jpg
          </code>
          . Нет фото — показывается заглушка с названием.
        </p>
      </div>

      {SECTIONS.map((s) => (
        <section key={s.key}>
          <div className="mb-3 flex items-baseline justify-between gap-3">
            <h3 className="text-sm font-bold uppercase tracking-wide text-ink">{s.title}</h3>
            <span className="text-xs text-muted">{s.items.length} шт.</span>
          </div>
          {s.items.length === 0 ? (
            <div className="rounded-xl border border-line bg-surface px-4 py-5 text-sm text-muted">
              Скоро — материалы добавляются (добавьте записи в{" "}
              <code className="text-gold">lib/{s.key}.ts</code>).
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {s.items.map((item) => (
                <MaterialCard key={item.id} catKey={s.key} item={item} canVisualize={s.canVisualize} />
              ))}
            </div>
          )}
        </section>
      ))}
    </div>
  );
}

function MaterialCard({
  catKey,
  item,
  canVisualize,
}: {
  catKey: string;
  item: CardItem;
  canVisualize: boolean;
}) {
  const [failed, setFailed] = useState(false);
  const showFallback = failed || !item.image;

  return (
    <div className="overflow-hidden rounded-xl border border-line bg-surface transition hover:border-gold/40">
      <div className="relative aspect-square w-full bg-canvas">
        {showFallback ? (
          <div
            className="flex h-full w-full flex-col items-center justify-center gap-1 text-center"
            style={item.swatch ? { background: item.swatch } : undefined}
          >
            {!item.swatch && (
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" className="text-muted/50">
                <rect x="3" y="3" width="18" height="18" rx="2" />
                <circle cx="9" cy="9" r="2" />
                <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
              </svg>
            )}
            <span className="px-2 text-[10px] font-medium text-muted">нет фото</span>
          </div>
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={item.image}
            alt={item.name}
            loading="lazy"
            onError={() => setFailed(true)}
            className="h-full w-full object-cover"
          />
        )}
      </div>
      <div className="p-3">
        <p className="truncate text-sm font-semibold text-ink">{item.name}</p>
        <p className="mt-0.5 text-[11px] text-muted">
          {item.note ? item.note : <span className="text-muted/60">id: {item.id}</span>}
        </p>
        {canVisualize && (
          <Link
            href={`/visualizer?cat=${catKey}&id=${item.id}`}
            className="mt-2 inline-flex items-center gap-1 text-xs font-bold text-gold transition hover:text-goldLight"
          >
            Визуализировать этим
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M5 12h14M13 6l6 6-6 6" />
            </svg>
          </Link>
        )}
      </div>
    </div>
  );
}
