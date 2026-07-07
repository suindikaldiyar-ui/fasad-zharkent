"use client";

import { useEffect, useRef, useState } from "react";
import { FOUNDATIONS } from "@/lib/foundations";
import { DECOR, DECOR_CATEGORY_LABEL } from "@/lib/decor";
import { FRAMES } from "@/lib/frames";
import { COLUMNS } from "@/lib/columns";
import { BELTS } from "@/lib/belts";
import { BRACKETS } from "@/lib/brackets";
import { TERMOPANELS } from "@/lib/termopanels";
import { AMK } from "@/lib/amk";
import { PANELS } from "@/lib/panels";
import { COLORS } from "@/lib/colors";
import { FACADE_COLORS } from "@/lib/facadecolors";
import { compressImage, type CompressedImage } from "@/lib/image";
import { MAX_REFERENCE_IMAGES } from "@/lib/constants";

// Необязательный предвыбор материала (напр. переход из /catalog «визуализировать этим»).
export interface VisualizerInitial {
  foundationId?: string | null;
  frameId?: string | null;
  columnId?: string | null;
  beltId?: string | null;
  bracketId?: string | null;
  termopanelId?: string | null;
  amkId?: string | null;
  // Клинкер (тест форма+цвет): форма и цвет отдельно для стены и цоколя.
  wallShapeId?: string | null;
  wallColorId?: string | null;
  plinthShapeId?: string | null;
  plinthColorId?: string | null;
  facadeColorId?: string;
  decorIds?: string[];
}

// Тип материала для стены / цоколя (одновременно активен ОДИН тип).
type WallType = "none" | "termopanel" | "amk" | "panels";
type PlinthType = "none" | "panels" | "foundation";

interface Props {
  initial?: VisualizerInitial;
}

export default function Visualizer({ initial }: Props) {
  const [source, setSource] = useState<CompressedImage | null>(null);
  // Выбор материалов — локальное состояние визуализатора (можно предзаполнить из /catalog).
  const [foundationId, setFoundationId] = useState<string | null>(initial?.foundationId ?? null);
  const [decorIds, setDecorIds] = useState<string[]>(initial?.decorIds ?? []);
  const [frameId, setFrameId] = useState<string | null>(initial?.frameId ?? null);
  const [frameColor, setFrameColor] = useState<"none" | "white" | "beige">("none");
  const [facadeColorId, setFacadeColorId] = useState<string>(initial?.facadeColorId ?? "none");
  const [columnId, setColumnId] = useState<string | null>(initial?.columnId ?? null);
  const [beltId, setBeltId] = useState<string | null>(initial?.beltId ?? null);
  const [bracketId, setBracketId] = useState<string | null>(initial?.bracketId ?? null);
  const [termopanelId, setTermopanelId] = useState<string | null>(initial?.termopanelId ?? null);
  const [amkId, setAmkId] = useState<string | null>(initial?.amkId ?? null);
  // Клинкер (тест): форма + цвет отдельно для стены и цоколя (независимо).
  const [wallShapeId, setWallShapeId] = useState<string | null>(initial?.wallShapeId ?? null);
  const [wallColorId, setWallColorId] = useState<string | null>(initial?.wallColorId ?? null);
  const [plinthShapeId, setPlinthShapeId] = useState<string | null>(initial?.plinthShapeId ?? null);
  const [plinthColorId, setPlinthColorId] = useState<string | null>(initial?.plinthColorId ?? null);
  // Активный ТИП материала стены/цоколя (стена и цоколь независимы). Из предвыбора — авто.
  const [wallType, setWallType] = useState<WallType>(
    initial?.termopanelId
      ? "termopanel"
      : initial?.amkId
      ? "amk"
      : initial?.wallShapeId || initial?.wallColorId
      ? "panels"
      : "none"
  );
  const [plinthType, setPlinthType] = useState<PlinthType>(
    initial?.plinthShapeId || initial?.plinthColorId
      ? "panels"
      : initial?.foundationId
      ? "foundation"
      : "none"
  );
  const [comment, setComment] = useState("");
  const [compareBrackets, setCompareBrackets] = useState(false);
  const [result, setResult] = useState<string | null>(null); // data url «ПОСЛЕ» (обычный режим)
  const [resultNo, setResultNo] = useState<string | null>(null); // без кронштейнов
  const [resultYes, setResultYes] = useState<string | null>(null); // с кронштейнами
  const [beforeUrl, setBeforeUrl] = useState<string | null>(null); // data url «ДО»
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const [failedImg, setFailedImg] = useState<Record<string, boolean>>({});
  const inputRef = useRef<HTMLInputElement>(null);

  const toggleDecor = (id: string) =>
    setDecorIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );

  // Переключение типа: активен один тип, поля остальных чистим →
  // в запрос уходят ТОЛЬКО поля выбранного типа. Стена и цоколь независимо.
  function selectWallType(t: WallType) {
    setWallType(t);
    if (t !== "termopanel") setTermopanelId(null);
    if (t !== "amk") setAmkId(null);
    if (t !== "panels") {
      setWallShapeId(null);
      setWallColorId(null);
    }
  }
  function selectPlinthType(t: PlinthType) {
    setPlinthType(t);
    if (t !== "panels") {
      setPlinthShapeId(null);
      setPlinthColorId(null);
    }
    if (t !== "foundation") setFoundationId(null);
  }

  // Сколько фото-референсов уйдёт в Gemini (та же логика бюджета, что на сервере):
  // комплект обрамления = 3 фото, остальные материалы = 1. Цвет фасада и декор —
  // текстовые подсказки, в бюджет фото не входят.
  const selectedFrame = FRAMES.find((f) => f.id === frameId);
  const frameCost = selectedFrame ? (selectedFrame.setImages ? 3 : 1) : 0;
  // Материал стены/цоколя — считаем ТОЛЬКО активный тип (термопанель=1, АМК=1, панель=форма+цвет=2).
  const wallRefs =
    wallType === "termopanel"
      ? termopanelId
        ? 1
        : 0
      : wallType === "amk"
      ? amkId
        ? 1
        : 0
      : wallType === "panels"
      ? (wallShapeId ? 1 : 0) + (wallColorId ? 1 : 0)
      : 0;
  const plinthRefs =
    plinthType === "panels"
      ? (plinthShapeId ? 1 : 0) + (plinthColorId ? 1 : 0)
      : plinthType === "foundation"
      ? foundationId
        ? 1
        : 0
      : 0;
  const photoRefCount =
    frameCost +
    (columnId ? 1 : 0) +
    (beltId ? 1 : 0) +
    (bracketId ? 1 : 0) +
    wallRefs +
    plinthRefs;
  const overRefLimit = photoRefCount > MAX_REFERENCE_IMAGES;

  async function handleFile(file: File | undefined | null) {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("Пожалуйста, загрузите изображение.");
      return;
    }
    setError(null);
    setResult(null);
    setResultNo(null);
    setResultYes(null);
    try {
      const compressed = await compressImage(file);
      setSource(compressed);
    } catch (e: any) {
      setError(e?.message || "Не удалось обработать изображение.");
    }
  }

  // Один запрос к Gemini → data url результата. bId — кронштейн для этого рендера.
  async function requestRender(bId: string | null): Promise<string> {
    const res = await fetch("/api/visualize", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        image: source!.base64,
        mimeType: source!.mimeType,
        decorIds,
        frameId,
        frameColor,
        facadeColorId,
        columnId,
        beltId,
        bracketId: bId,
        // Материал СТЕНЫ — только поля активного типа (остальные null).
        termopanelId: wallType === "termopanel" ? termopanelId : null,
        amkId: wallType === "amk" ? amkId : null,
        wallShapeId: wallType === "panels" ? wallShapeId : null,
        wallColorId: wallType === "panels" ? wallColorId : null,
        // Материал ЦОКОЛЯ — только поля активного типа (независимо от стены).
        plinthShapeId: plinthType === "panels" ? plinthShapeId : null,
        plinthColorId: plinthType === "panels" ? plinthColorId : null,
        foundationId: plinthType === "foundation" ? foundationId : null,
        comment: comment.trim(),
      }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data?.error || "Ошибка генерации.");
    return `data:${data.mimeType || "image/png"};base64,${data.image}`;
  }

  async function generate() {
    if (!source) return;
    setLoading(true);
    setError(null);
    setResult(null);
    setResultNo(null);
    setResultYes(null);
    try {
      if (compareBrackets && bracketId) {
        // Две версии одного дома: без кронштейна и с выбранным кронштейном
        const [no, yes] = await Promise.all([
          requestRender(null),
          requestRender(bracketId),
        ]);
        setBeforeUrl(source.dataUrl);
        setResultNo(no);
        setResultYes(yes);
      } else {
        const r = await requestRender(bracketId);
        setBeforeUrl(source.dataUrl);
        setResult(r);
      }
    } catch (e: any) {
      setError(e?.message || "Не удалось сгенерировать визуализацию.");
    } finally {
      setLoading(false);
    }
  }

  function downloadUrl(url: string, name: string) {
    const a = document.createElement("a");
    a.href = url;
    a.download = name;
    a.click();
  }

  function download() {
    if (result) downloadUrl(result, "fasad-group-facade.png");
  }

  // Загрузка картинки из data url в HTMLImageElement
  function loadImg(src: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error("Не удалось загрузить изображение."));
      img.src = src;
    });
  }

  // Склейка двух картинок в одну (рядом, с подписями) через canvas
  async function mergeSideBySide(
    urlA: string,
    labelA: string,
    urlB: string,
    labelB: string,
    filename: string
  ) {
    try {
      const [a, b] = await Promise.all([loadImg(urlA), loadImg(urlB)]);

      const H = 800; // общая высота
      const GAP = 6; // белая полоса-разделитель
      const wA = Math.round((a.width / a.height) * H);
      const wB = Math.round((b.width / b.height) * H);
      const W = wA + GAP + wB;

      const canvas = document.createElement("canvas");
      canvas.width = W;
      canvas.height = H;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      ctx.fillStyle = "#FFFFFF";
      ctx.fillRect(0, 0, W, H);
      ctx.drawImage(a, 0, 0, wA, H);
      ctx.drawImage(b, wA + GAP, 0, wB, H);

      drawLabel(ctx, labelA, 0, H);
      drawLabel(ctx, labelB, wA + GAP, H);

      downloadUrl(canvas.toDataURL("image/jpeg", 0.9), filename);
    } catch (e: any) {
      setError(e?.message || "Не удалось собрать сравнение.");
    }
  }

  function downloadBoth() {
    if (beforeUrl && result)
      mergeSideBySide(beforeUrl, "ДО", result, "ПОСЛЕ", "fasad-group-do-posle.jpg");
  }

  function downloadComparison() {
    if (resultNo && resultYes)
      mergeSideBySide(
        resultNo,
        "Без кронштейнов",
        resultYes,
        "С кронштейнами",
        "fasad-group-brackets.jpg"
      );
  }

  // Плашка с подписью в левом нижнем углу панели, начинающейся с offsetX
  function drawLabel(
    ctx: CanvasRenderingContext2D,
    text: string,
    offsetX: number,
    H: number
  ) {
    const fontSize = 34;
    ctx.font = `700 ${fontSize}px Manrope, system-ui, sans-serif`;
    const padX = 18;
    const padY = 12;
    const tw = ctx.measureText(text).width;
    const boxW = tw + padX * 2;
    const boxH = fontSize + padY * 2;
    const x = offsetX + 20;
    const y = H - boxH - 20;

    ctx.fillStyle = "rgba(31,27,22,0.72)";
    ctx.fillRect(x, y, boxW, boxH);
    ctx.fillStyle = "#FFFFFF";
    ctx.textBaseline = "middle";
    ctx.fillText(text, x + padX, y + boxH / 2);
  }

  return (
    <section className="rounded-2xl bg-surface p-5 shadow-card sm:p-7">
      <div className="mb-5 flex items-center gap-3">
        <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-terracotta/10 text-terracotta">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="3" width="18" height="18" rx="2" />
            <circle cx="9" cy="9" r="2" />
            <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
          </svg>
        </span>
        <div>
          <h2 className="text-lg font-bold text-ink">AI-визуализация фасада</h2>
          <p className="text-sm text-ink/50">
            Загрузите фото дома и подберите отделку фасада
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[320px_1fr]">
        {/* Левая колонка — загрузка + палитра */}
        <div className="space-y-5">
          {/* Загрузка */}
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragging(false);
              handleFile(e.dataTransfer.files?.[0]);
            }}
            onClick={() => inputRef.current?.click()}
            className={`flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed px-4 py-8 text-center transition ${
              dragging
                ? "border-terracotta bg-terracotta/5"
                : "border-line bg-canvas/50 hover:border-terracotta/50"
            }`}
          >
            {source ? (
              <img
                src={source.dataUrl}
                alt="Фото дома"
                className="max-h-40 rounded-lg object-contain"
              />
            ) : (
              <>
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" className="mb-2 text-ink/30">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <path d="m17 8-5-5-5 5" />
                  <path d="M12 3v12" />
                </svg>
                <p className="text-sm font-medium text-ink">
                  Перетащите фото или нажмите
                </p>
                <p className="mt-1 text-xs text-ink/40">JPG, PNG · фасад дома</p>
              </>
            )}
            <input
              ref={inputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => handleFile(e.target.files?.[0])}
            />
          </div>

          {source && (
            <button
              type="button"
              onClick={() => {
                setSource(null);
                setResult(null);
                setError(null);
                if (inputRef.current) inputRef.current.value = "";
              }}
              className="text-xs font-medium text-ink/50 hover:text-terracotta"
            >
              Загрузить другое фото
            </button>
          )}


          {/* Каталог материалов — заголовок, бюджет фото и путь для фото */}
          <div className="rounded-xl border border-line bg-canvas/40 p-3.5">
            <div className="flex items-center gap-2">
              <span className="inline-flex h-6 w-6 items-center justify-center rounded-lg bg-gold/15 text-gold">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="3" width="7" height="7" rx="1.5" />
                  <rect x="14" y="3" width="7" height="7" rx="1.5" />
                  <rect x="3" y="14" width="7" height="7" rx="1.5" />
                  <rect x="14" y="14" width="7" height="7" rx="1.5" />
                </svg>
              </span>
              <p className="text-sm font-bold text-ink">Каталог материалов</p>
            </div>
            <p className="mt-1.5 text-xs text-muted">
              Выберите отделку в карточках ниже — выбранное уходит референсом в ИИ.
            </p>

            {/* Индикатор бюджета фото-референсов (сервер шлёт максимум MAX) */}
            <div className="mt-2.5 flex items-center justify-between gap-2 border-t border-line pt-2.5 text-xs">
              <span className="text-muted">Фото-референсов к Gemini</span>
              <span className={`tnum font-bold ${overRefLimit ? "text-gold" : "text-ink"}`}>
                {photoRefCount} / {MAX_REFERENCE_IMAGES}
              </span>
            </div>
            {overRefLimit && (
              <p className="mt-2 rounded-lg border border-gold/30 bg-gold/10 px-2.5 py-1.5 text-[11px] leading-snug text-gold">
                Выбрано больше {MAX_REFERENCE_IMAGES}: к Gemini уйдут только{" "}
                {MAX_REFERENCE_IMAGES} фото (приоритет: материал стен → обрамление →
                цоколь → колонны → пояс → кронштейны), остальное — текстовым описанием.
              </p>
            )}

            <p className="mt-2.5 text-[11px] leading-snug text-muted/80">
              Фото каталога кладите в{" "}
              <code className="rounded bg-stone px-1 py-0.5 text-gold">
                public/references/&lt;категория&gt;/&lt;id&gt;.jpg
              </code>
            </p>
          </div>

          {/* Цвет фасада (краска стен) */}
          <div>
            <p className="mb-2 text-sm font-semibold text-ink">Цвет фасада</p>
            <div className="grid grid-cols-3 gap-2">
              {FACADE_COLORS.map((c) => {
                const active = c.id === facadeColorId;
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setFacadeColorId(c.id)}
                    className={`flex flex-col items-center gap-1.5 rounded-xl border p-2 transition ${
                      active
                        ? "border-gold ring-2 ring-gold/30"
                        : "border-line hover:border-gold/40"
                    }`}
                  >
                    <span
                      className="h-8 w-8 rounded-full border border-black/10"
                      style={{ background: c.swatch }}
                    />
                    <span className="text-xs font-medium leading-tight text-ink">
                      {c.name}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Выбор декора (мультивыбор) */}
          <div>
            <p className="mb-2 text-sm font-semibold text-ink">
              Декор{" "}
              <span className="font-normal text-muted">(можно несколько)</span>
            </p>
            {DECOR.length === 0 ? (
              <ComingSoon />
            ) : (
              <div className="grid grid-cols-2 gap-2">
                {DECOR.map((d) => {
                  const active = decorIds.includes(d.id);
                  return (
                    <button
                      key={d.id}
                      type="button"
                      onClick={() => toggleDecor(d.id)}
                      className={`relative flex items-center gap-2 rounded-xl border p-2 text-left transition ${
                        active
                          ? "border-gold ring-2 ring-gold/30"
                          : "border-line hover:border-gold/40"
                      }`}
                    >
                      {failedImg[d.image] ? (
                        <span
                          className="h-8 w-8 shrink-0 rounded-lg border border-black/10"
                          style={{ background: d.swatch }}
                        />
                      ) : (
                        <img
                          src={d.image}
                          alt={d.name}
                          loading="lazy"
                          onError={() =>
                            setFailedImg((p) => ({ ...p, [d.image]: true }))
                          }
                          className="h-8 w-8 shrink-0 rounded-lg border border-black/10 object-cover"
                        />
                      )}
                      <span className="min-w-0">
                        <span className="block truncate text-xs font-medium leading-tight text-ink">
                          {d.name}
                        </span>
                        <span className="block text-[10px] text-muted">
                          {DECOR_CATEGORY_LABEL[d.category]}
                        </span>
                      </span>
                      {active && (
                        <span className="absolute right-1.5 top-1.5 inline-flex h-4 w-4 items-center justify-center rounded-full bg-gold text-stone">
                          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                            <path d="M20 6 9 17l-5-5" />
                          </svg>
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Обрамление окон (по фото-референсу) */}
          <div>
            <p className="mb-2 text-sm font-semibold text-ink">Обрамление окон</p>
            <div className="grid grid-cols-2 gap-2">
              {/* «Без обрамления» — всегда */}
              <button
                type="button"
                onClick={() => setFrameId(null)}
                className={`flex items-center gap-2 rounded-xl border p-2 text-left transition ${
                  frameId === null
                    ? "border-gold ring-2 ring-gold/30"
                    : "border-line hover:border-gold/40"
                }`}
              >
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-line text-muted">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="9" />
                    <path d="m5 5 14 14" />
                  </svg>
                </span>
                <span className="text-xs font-medium leading-tight text-ink">
                  Без обрамления
                </span>
              </button>

              {FRAMES.map((f) => {
                const active = f.id === frameId;
                return (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => setFrameId(f.id)}
                    className={`flex items-center gap-2 rounded-xl border p-2 text-left transition ${
                      active
                        ? "border-gold ring-2 ring-gold/30"
                        : "border-line hover:border-gold/40"
                    }`}
                  >
                    {failedImg[f.image] ? (
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-line text-muted">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
                          <rect x="3" y="3" width="18" height="18" rx="2" />
                          <circle cx="9" cy="9" r="2" />
                          <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
                        </svg>
                      </span>
                    ) : (
                      <img
                        src={f.image}
                        alt={f.name}
                        loading="lazy"
                        onError={() =>
                          setFailedImg((p) => ({ ...p, [f.image]: true }))
                        }
                        className="h-8 w-8 shrink-0 rounded-lg border border-black/10 object-cover"
                      />
                    )}
                    <span className="min-w-0">
                      <span className="block truncate text-xs font-medium leading-tight text-ink">
                        {f.name}
                      </span>
                      {f.setImages && (
                        <span className="block text-[10px] text-gold">комплект · 3 профиля</span>
                      )}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Цвет обрамления */}
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <span className="text-xs text-muted">Цвет:</span>
              {([
                { id: "none", name: "Без цвета", sw: null },
                { id: "white", name: "Белый", sw: "#F2EFE9" },
                { id: "beige", name: "Бежевый", sw: "#E8D08A" },
              ] as const).map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setFrameColor(c.id)}
                  className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-medium transition ${
                    frameColor === c.id
                      ? "border-gold ring-2 ring-gold/30 text-ink"
                      : "border-line text-muted hover:border-gold/40"
                  }`}
                >
                  {c.sw ? (
                    <span
                      className="h-3.5 w-3.5 rounded-full border border-black/10"
                      style={{ background: c.sw }}
                    />
                  ) : (
                    <span className="flex h-3.5 w-3.5 items-center justify-center rounded-full border border-line text-muted">
                      <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <circle cx="12" cy="12" r="9" />
                        <path d="m5 5 14 14" />
                      </svg>
                    </span>
                  )}
                  {c.name}
                </button>
              ))}
            </div>
          </div>

          {/* ── Материал стен: сначала ТИП, потом только его галерея ── */}
          <div className="rounded-xl border border-line bg-canvas/40 p-3.5">
            <p className="mb-2.5 text-sm font-bold text-ink">Материал стен</p>
            <TypeTabs
              value={wallType}
              onChange={selectWallType}
              options={[
                { id: "none", label: "Нет" },
                { id: "termopanel", label: "Термопанель" },
                { id: "amk", label: "АМК кирпич" },
                { id: "panels", label: "Панели" },
              ]}
            />
            <div className="mt-3">
              {wallType === "none" && (
                <p className="text-xs text-muted">Материал стен не выбран.</p>
              )}
              {wallType === "termopanel" && (
                <MaterialTiles
                  items={TERMOPANELS}
                  selectedId={termopanelId}
                  onSelect={setTermopanelId}
                  emptyLabel="Без термопанели"
                  failedImg={failedImg}
                  onFail={(img) => setFailedImg((p) => ({ ...p, [img]: true }))}
                />
              )}
              {wallType === "amk" && (
                <MaterialTiles
                  items={AMK}
                  selectedId={amkId}
                  onSelect={setAmkId}
                  emptyLabel="Без АМК"
                  failedImg={failedImg}
                  onFail={(img) => setFailedImg((p) => ({ ...p, [img]: true }))}
                />
              )}
              {wallType === "panels" && (
                <div className="space-y-3">
                  <div>
                    <p className="mb-1.5 text-xs font-semibold text-ink">Форма стены</p>
                    <RefPicker
                      items={PANELS}
                      selectedId={wallShapeId}
                      onSelect={setWallShapeId}
                      emptyLabel="Без формы"
                      failedImg={failedImg}
                      onFail={(img) => setFailedImg((p) => ({ ...p, [img]: true }))}
                    />
                  </div>
                  <div>
                    <p className="mb-1.5 text-xs font-semibold text-ink">Цвет стены</p>
                    <RefPicker
                      items={COLORS}
                      selectedId={wallColorId}
                      onSelect={setWallColorId}
                      emptyLabel="Без цвета"
                      cols={4}
                      failedImg={failedImg}
                      onFail={(img) => setFailedImg((p) => ({ ...p, [img]: true }))}
                    />
                  </div>
                  <p className="text-[11px] leading-snug text-muted">
                    Форма = рельеф панели, цвет = краска (2 референса).
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* ── Материал цоколя: независимо от стены, сначала ТИП ── */}
          <div className="rounded-xl border border-line bg-canvas/40 p-3.5">
            <p className="mb-2.5 text-sm font-bold text-ink">Материал цоколя</p>
            <TypeTabs
              value={plinthType}
              onChange={selectPlinthType}
              options={[
                { id: "none", label: "Без цоколя" },
                { id: "panels", label: "Панели" },
                { id: "foundation", label: "Цоколь-плитка" },
              ]}
            />
            <div className="mt-3">
              {plinthType === "none" && (
                <p className="text-xs text-muted">Цоколь без отделки.</p>
              )}
              {plinthType === "panels" && (
                <div className="space-y-3">
                  <div>
                    <p className="mb-1.5 text-xs font-semibold text-ink">Форма цоколя</p>
                    <RefPicker
                      items={PANELS}
                      selectedId={plinthShapeId}
                      onSelect={setPlinthShapeId}
                      emptyLabel="Без формы"
                      failedImg={failedImg}
                      onFail={(img) => setFailedImg((p) => ({ ...p, [img]: true }))}
                    />
                  </div>
                  <div>
                    <p className="mb-1.5 text-xs font-semibold text-ink">Цвет цоколя</p>
                    <RefPicker
                      items={COLORS}
                      selectedId={plinthColorId}
                      onSelect={setPlinthColorId}
                      emptyLabel="Без цвета"
                      cols={4}
                      failedImg={failedImg}
                      onFail={(img) => setFailedImg((p) => ({ ...p, [img]: true }))}
                    />
                  </div>
                  <p className="text-[11px] leading-snug text-muted">
                    Форма = рельеф панели цоколя, цвет = краска (2 референса).
                  </p>
                </div>
              )}
              {plinthType === "foundation" && (
                <MaterialTiles
                  items={FOUNDATIONS}
                  selectedId={foundationId}
                  onSelect={setFoundationId}
                  emptyLabel="Без плитки"
                  failedImg={failedImg}
                  onFail={(img) => setFailedImg((p) => ({ ...p, [img]: true }))}
                />
              )}
            </div>
          </div>

          {/* Угловые колонны (по фото-референсу) */}
          <div>
            <p className="mb-2 text-sm font-semibold text-ink">Угловые колонны</p>
            {COLUMNS.length === 0 ? (
              <ComingSoon />
            ) : (
              <div className="grid grid-cols-2 gap-2">
                {/* «Без колонн» — всегда */}
                <button
                  type="button"
                  onClick={() => setColumnId(null)}
                  className={`flex items-center gap-2 rounded-xl border p-2 text-left transition ${
                    columnId === null
                      ? "border-gold ring-2 ring-gold/30"
                      : "border-line hover:border-gold/40"
                  }`}
                >
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-line text-muted">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="12" cy="12" r="9" />
                      <path d="m5 5 14 14" />
                    </svg>
                  </span>
                  <span className="text-xs font-medium leading-tight text-ink">
                    Без колонн
                  </span>
                </button>

                {COLUMNS.map((c) => {
                  const active = c.id === columnId;
                  return (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => setColumnId(c.id)}
                      className={`flex items-center gap-2 rounded-xl border p-2 text-left transition ${
                        active
                          ? "border-gold ring-2 ring-gold/30"
                          : "border-line hover:border-gold/40"
                      }`}
                    >
                      {failedImg[c.image] ? (
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-line text-muted">
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
                            <rect x="3" y="3" width="18" height="18" rx="2" />
                            <circle cx="9" cy="9" r="2" />
                            <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
                          </svg>
                        </span>
                      ) : (
                        <img
                          src={c.image}
                          alt={c.name}
                          loading="lazy"
                          onError={() =>
                            setFailedImg((p) => ({ ...p, [c.image]: true }))
                          }
                          className="h-8 w-8 shrink-0 rounded-lg border border-black/10 object-cover"
                        />
                      )}
                      <span className="text-xs font-medium leading-tight text-ink">
                        {c.name}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Межэтажный пояс (по фото-референсу) */}
          <div>
            <p className="mb-2 text-sm font-semibold text-ink">Межэтажный пояс</p>
            {BELTS.length === 0 ? (
              <ComingSoon />
            ) : (
              <div className="grid grid-cols-2 gap-2">
                {/* «Без пояса» — всегда */}
                <button
                  type="button"
                  onClick={() => setBeltId(null)}
                  className={`flex items-center gap-2 rounded-xl border p-2 text-left transition ${
                    beltId === null
                      ? "border-gold ring-2 ring-gold/30"
                      : "border-line hover:border-gold/40"
                  }`}
                >
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-line text-muted">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="12" cy="12" r="9" />
                      <path d="m5 5 14 14" />
                    </svg>
                  </span>
                  <span className="text-xs font-medium leading-tight text-ink">
                    Без пояса
                  </span>
                </button>

                {BELTS.map((b) => {
                  const active = b.id === beltId;
                  return (
                    <button
                      key={b.id}
                      type="button"
                      onClick={() => setBeltId(b.id)}
                      className={`flex items-center gap-2 rounded-xl border p-2 text-left transition ${
                        active
                          ? "border-gold ring-2 ring-gold/30"
                          : "border-line hover:border-gold/40"
                      }`}
                    >
                      {failedImg[b.image] ? (
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-line text-muted">
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
                            <rect x="3" y="3" width="18" height="18" rx="2" />
                            <circle cx="9" cy="9" r="2" />
                            <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
                          </svg>
                        </span>
                      ) : (
                        <img
                          src={b.image}
                          alt={b.name}
                          loading="lazy"
                          onError={() =>
                            setFailedImg((p) => ({ ...p, [b.image]: true }))
                          }
                          className="h-8 w-8 shrink-0 rounded-lg border border-black/10 object-cover"
                        />
                      )}
                      <span className="min-w-0">
                        <span className="block truncate text-xs font-medium leading-tight text-ink">
                          {b.name}
                        </span>
                        <span className="block text-[10px] text-muted">{b.size}</span>
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Комментарий */}
          <div>
            <p className="mb-2 text-sm font-semibold text-ink">
              Комментарий{" "}
              <span className="font-normal text-ink/40">(по желанию)</span>
            </p>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={2}
              placeholder="напр.: окна сделать белыми, колонны по углам"
              className="w-full resize-none rounded-xl border border-line bg-canvas/50 px-3.5 py-2.5 text-sm text-ink outline-none transition placeholder:text-ink/30 focus:border-terracotta focus:bg-surface"
            />
          </div>

          {/* Кронштейны (по фото-референсу) */}
          <div>
            <p className="mb-2 text-sm font-semibold text-ink">Кронштейны</p>
            {BRACKETS.length === 0 ? (
              <ComingSoon />
            ) : (
              <div className="grid grid-cols-2 gap-2">
                {/* «Без кронштейна» — всегда */}
                <button
                  type="button"
                  onClick={() => setBracketId(null)}
                  className={`flex items-center gap-2 rounded-xl border p-2 text-left transition ${
                    bracketId === null
                      ? "border-gold ring-2 ring-gold/30"
                      : "border-line hover:border-gold/40"
                  }`}
                >
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-line text-muted">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="12" cy="12" r="9" />
                      <path d="m5 5 14 14" />
                    </svg>
                  </span>
                  <span className="text-xs font-medium leading-tight text-ink">
                    Без кронштейна
                  </span>
                </button>

                {BRACKETS.map((b) => {
                  const active = b.id === bracketId;
                  return (
                    <button
                      key={b.id}
                      type="button"
                      onClick={() => setBracketId(b.id)}
                      className={`flex items-center gap-2 rounded-xl border p-2 text-left transition ${
                        active
                          ? "border-gold ring-2 ring-gold/30"
                          : "border-line hover:border-gold/40"
                      }`}
                    >
                      {failedImg[b.image] ? (
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-line text-muted">
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
                            <rect x="3" y="3" width="18" height="18" rx="2" />
                            <circle cx="9" cy="9" r="2" />
                            <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
                          </svg>
                        </span>
                      ) : (
                        <img
                          src={b.image}
                          alt={b.name}
                          loading="lazy"
                          onError={() =>
                            setFailedImg((p) => ({ ...p, [b.image]: true }))
                          }
                          className="h-8 w-8 shrink-0 rounded-lg border border-black/10 object-cover"
                        />
                      )}
                      <span className="min-w-0">
                        <span className="block truncate text-xs font-medium leading-tight text-ink">
                          {b.name}
                        </span>
                        <span className="block text-[10px] text-muted">{b.size}</span>
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Сравнение: без / с кронштейнами */}
          <label className="flex cursor-pointer items-start gap-2.5 rounded-xl border border-line bg-canvas/50 p-3">
            <input
              type="checkbox"
              checked={compareBrackets}
              onChange={(e) => {
                setCompareBrackets(e.target.checked);
                setResult(null);
                setResultNo(null);
                setResultYes(null);
              }}
              className="mt-0.5 h-4 w-4 shrink-0 accent-gold"
            />
            <span className="text-xs leading-snug text-ink">
              <span className="font-semibold">Сравнить кронштейны</span>
              <span className="block text-muted">
                две версии: без и с кронштейнами
              </span>
            </span>
          </label>

          <button
            type="button"
            onClick={generate}
            disabled={!source || loading}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-br from-gold to-goldLight px-4 py-3 text-sm font-bold text-stone shadow-gold transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {loading ? (
              <>
                <Spinner />
                {compareBrackets && bracketId ? "Генерация 2 версий…" : "Генерация…"}
              </>
            ) : (
              <>✨ Визуализировать</>
            )}
          </button>

          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-medium text-red-700">
              {error}
            </div>
          )}
        </div>

        {/* Правая колонка — результат */}
        <div className="flex min-h-[280px] flex-col rounded-xl border border-line bg-canvas/40 p-3">
          {loading ? (
            <div className="flex flex-1 flex-col items-center justify-center gap-3 text-ink/50">
              <Spinner large />
              <p className="text-sm">
                {compareBrackets && bracketId
                  ? "Генерируем две версии фасада…"
                  : "Генерируем визуализацию фасада…"}
              </p>
            </div>
          ) : resultNo && resultYes ? (
            <div className="flex flex-1 flex-col gap-3">
              {/* ДО сверху */}
              {beforeUrl && (
                <div className="relative overflow-hidden rounded-lg">
                  <img
                    src={beforeUrl}
                    alt="До"
                    className="max-h-48 w-full rounded-lg object-contain"
                  />
                  <span className="absolute bottom-2 left-2 rounded-md bg-black/55 px-2 py-0.5 text-xs font-bold uppercase tracking-wide text-white">
                    До
                  </span>
                </div>
              )}
              {/* Две версии рендера рядом */}
              <div className="grid flex-1 grid-cols-1 gap-2 sm:grid-cols-2">
                <div className="relative overflow-hidden rounded-lg">
                  <img
                    src={resultNo}
                    alt="Без кронштейнов"
                    className="h-full w-full rounded-lg object-contain"
                  />
                  <span className="absolute bottom-2 left-2 rounded-md bg-black/55 px-2 py-0.5 text-xs font-bold uppercase tracking-wide text-white">
                    Без кронштейнов
                  </span>
                </div>
                <div className="relative overflow-hidden rounded-lg">
                  <img
                    src={resultYes}
                    alt="С кронштейнами"
                    className="h-full w-full rounded-lg object-contain"
                  />
                  <span className="absolute bottom-2 left-2 rounded-md bg-black/55 px-2 py-0.5 text-xs font-bold uppercase tracking-wide text-white">
                    С кронштейнами
                  </span>
                </div>
              </div>
              {/* Кнопки скачивания */}
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => downloadUrl(resultNo, "fasad-group-no-brackets.png")}
                  className="inline-flex items-center gap-2 rounded-lg border border-line bg-surface px-3.5 py-2 text-sm font-semibold text-ink transition hover:border-terracotta hover:text-terracotta"
                >
                  <DownloadIcon /> Без кронштейнов
                </button>
                <button
                  type="button"
                  onClick={() => downloadUrl(resultYes, "fasad-group-with-brackets.png")}
                  className="inline-flex items-center gap-2 rounded-lg border border-line bg-surface px-3.5 py-2 text-sm font-semibold text-ink transition hover:border-terracotta hover:text-terracotta"
                >
                  <DownloadIcon /> С кронштейнами
                </button>
                <button
                  type="button"
                  onClick={downloadComparison}
                  className="inline-flex items-center gap-2 rounded-lg bg-stone px-3.5 py-2 text-sm font-semibold text-white transition hover:bg-stone/90"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="3" y="5" width="7" height="14" rx="1" />
                    <rect x="14" y="5" width="7" height="14" rx="1" />
                  </svg>
                  Скачать сравнение
                </button>
              </div>
            </div>
          ) : result ? (
            <div className="flex flex-1 flex-col">
              {/* ДО / ПОСЛЕ — интерактивный слайдер сравнения */}
              <div className="flex-1">
                {beforeUrl ? (
                  <BeforeAfterSlider before={beforeUrl} after={result} />
                ) : (
                  <img
                    src={result}
                    alt="После"
                    className="h-full w-full rounded-lg object-contain"
                  />
                )}
              </div>

              {/* Кнопки скачивания */}
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={download}
                  className="inline-flex items-center justify-center gap-2 rounded-lg border border-line bg-surface px-4 py-2 text-sm font-semibold text-ink transition hover:border-terracotta hover:text-terracotta"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <path d="m7 10 5 5 5-5" />
                    <path d="M12 15V3" />
                  </svg>
                  Скачать результат
                </button>
                <button
                  type="button"
                  onClick={downloadBoth}
                  className="inline-flex items-center justify-center gap-2 rounded-lg bg-stone px-4 py-2 text-sm font-semibold text-white transition hover:bg-stone/90"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="3" y="5" width="7" height="14" rx="1" />
                    <rect x="14" y="5" width="7" height="14" rx="1" />
                  </svg>
                  Скачать ДО/ПОСЛЕ
                </button>
              </div>
            </div>
          ) : (
            <div className="flex flex-1 flex-col items-center justify-center gap-2 text-center text-ink/40">
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.3">
                <rect x="3" y="3" width="18" height="18" rx="2" />
                <circle cx="9" cy="9" r="2" />
                <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
              </svg>
              <p className="text-sm">Здесь появится визуализация фасада</p>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

// Интерактивный слайдер сравнения ДО/ПОСЛЕ.
function BeforeAfterSlider({ before, after }: { before: string; after: string }) {
  const [pos, setPos] = useState(50); // позиция бегунка, %
  const containerRef = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);

  const setFromClientX = (clientX: number) => {
    const el = containerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const p = ((clientX - rect.left) / rect.width) * 100;
    setPos(Math.max(0, Math.min(100, p)));
  };

  // Перетаскивание мышью — слушаем на window, пока зажато.
  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (dragging.current) setFromClientX(e.clientX);
    };
    const onUp = () => {
      dragging.current = false;
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className="relative aspect-[4/3] w-full cursor-ew-resize touch-none select-none overflow-hidden rounded-lg bg-black/10"
      onMouseDown={(e) => {
        dragging.current = true;
        setFromClientX(e.clientX);
      }}
      onTouchStart={(e) => setFromClientX(e.touches[0].clientX)}
      onTouchMove={(e) => setFromClientX(e.touches[0].clientX)}
    >
      {/* Нижний слой — ПОСЛЕ */}
      <img
        src={after}
        alt="После"
        draggable={false}
        className="pointer-events-none absolute inset-0 h-full w-full object-contain"
      />
      {/* Верхний слой — ДО, обрезается справа по позиции бегунка */}
      <div
        className="absolute inset-0 overflow-hidden"
        style={{ clipPath: `inset(0 ${100 - pos}% 0 0)` }}
      >
        <img
          src={before}
          alt="До"
          draggable={false}
          className="pointer-events-none absolute inset-0 h-full w-full object-contain"
        />
      </div>

      {/* Подписи */}
      <span className="pointer-events-none absolute left-2 top-2 rounded-md bg-black/55 px-2 py-0.5 text-xs font-bold uppercase tracking-wide text-white">
        До
      </span>
      <span className="pointer-events-none absolute right-2 top-2 rounded-md bg-black/55 px-2 py-0.5 text-xs font-bold uppercase tracking-wide text-white">
        После
      </span>

      {/* Разделитель + ручка */}
      <div
        className="absolute inset-y-0 z-10"
        style={{ left: `${pos}%`, transform: "translateX(-50%)" }}
      >
        <div className="mx-auto h-full w-0.5 bg-gradient-to-b from-gold to-goldLight" />
        <button
          type="button"
          aria-label="Двигать сравнение"
          onMouseDown={(e) => {
            e.stopPropagation();
            dragging.current = true;
          }}
          className="absolute left-1/2 top-1/2 flex h-9 w-9 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-2 border-gold bg-stone text-gold shadow-gold"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="m9 7-5 5 5 5M15 7l5 5-5 5" />
          </svg>
        </button>
      </div>
    </div>
  );
}

function DownloadIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <path d="m7 10 5 5 5-5" />
      <path d="M12 15V3" />
    </svg>
  );
}

function ComingSoon() {
  return (
    <div className="flex items-center gap-2 rounded-xl border border-line bg-canvas/50 px-3 py-3">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="shrink-0 text-gold">
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7v5l3 2" />
      </svg>
      <span className="text-xs font-medium text-muted">
        Скоро — материалы добавляются
      </span>
    </div>
  );
}

// Универсальный выбор референса (форма / цвет): сетка карточек {id,name,image}.
function RefPicker({
  items,
  selectedId,
  onSelect,
  emptyLabel,
  failedImg,
  onFail,
  cols = 2,
}: {
  items: { id: string; name: string; image: string }[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  emptyLabel: string;
  failedImg: Record<string, boolean>;
  onFail: (image: string) => void;
  cols?: 2 | 4;
}) {
  if (items.length === 0) return <ComingSoon />;
  return (
    <div className={cols === 4 ? "grid grid-cols-4 gap-2" : "grid grid-cols-2 gap-2"}>
      {/* «Без …» — всегда */}
      <button
        type="button"
        onClick={() => onSelect(null)}
        className={`flex items-center justify-center rounded-lg border p-2 text-center text-[11px] font-medium leading-tight transition ${
          selectedId === null
            ? "border-gold ring-2 ring-gold/30 text-ink"
            : "border-line text-muted hover:border-gold/40"
        }`}
      >
        {emptyLabel}
      </button>

      {items.map((it) => {
        const active = it.id === selectedId;
        return (
          <button
            key={it.id}
            type="button"
            title={it.name}
            onClick={() => onSelect(it.id)}
            className={`flex flex-col items-center gap-1 rounded-lg border p-1.5 transition ${
              active ? "border-gold ring-2 ring-gold/30" : "border-line hover:border-gold/40"
            }`}
          >
            {failedImg[it.image] ? (
              <span className="flex aspect-square w-full items-center justify-center rounded border border-line text-center text-[9px] text-muted">
                нет фото
              </span>
            ) : (
              <img
                src={it.image}
                alt={it.name}
                loading="lazy"
                onError={() => onFail(it.image)}
                className="aspect-square w-full rounded border border-black/10 object-cover"
              />
            )}
            <span className="block w-full truncate text-center text-[10px] font-medium leading-tight text-ink">
              {it.name}
            </span>
          </button>
        );
      })}
    </div>
  );
}

// Табы выбора типа материала. Активный — жёлтый (тёмный текст), как на сайте.
function TypeTabs<T extends string>({
  value,
  onChange,
  options,
}: {
  value: T;
  onChange: (v: T) => void;
  options: { id: T; label: string }[];
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map((o) => {
        const active = value === o.id;
        return (
          <button
            key={o.id}
            type="button"
            onClick={() => onChange(o.id)}
            className={`rounded-lg border px-3 py-1.5 text-xs font-semibold transition ${
              active
                ? "border-gold bg-gold text-stone"
                : "border-line text-muted hover:border-gold/40 hover:text-ink"
            }`}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

// Сетка карточек материала (термопанель / АМК / цоколь-плитка): фото + название,
// swatch/иконка при отсутствии фото, кнопка «Без …». Одиночный выбор (1 референс).
function MaterialTiles({
  items,
  selectedId,
  onSelect,
  emptyLabel,
  failedImg,
  onFail,
}: {
  items: { id: string; name: string; image: string; size?: string; swatch?: string }[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  emptyLabel: string;
  failedImg: Record<string, boolean>;
  onFail: (image: string) => void;
}) {
  if (items.length === 0) return <ComingSoon />;
  return (
    <div className="grid grid-cols-2 gap-2">
      <button
        type="button"
        onClick={() => onSelect(null)}
        className={`flex items-center gap-2 rounded-xl border p-2 text-left transition ${
          selectedId === null
            ? "border-gold ring-2 ring-gold/30"
            : "border-line hover:border-gold/40"
        }`}
      >
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-line text-muted">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="9" />
            <path d="m5 5 14 14" />
          </svg>
        </span>
        <span className="text-xs font-medium leading-tight text-ink">{emptyLabel}</span>
      </button>

      {items.map((it) => {
        const active = it.id === selectedId;
        return (
          <button
            key={it.id}
            type="button"
            onClick={() => onSelect(it.id)}
            className={`flex items-center gap-2 rounded-xl border p-2 text-left transition ${
              active ? "border-gold ring-2 ring-gold/30" : "border-line hover:border-gold/40"
            }`}
          >
            {failedImg[it.image] ? (
              it.swatch ? (
                <span
                  className="h-8 w-8 shrink-0 rounded-lg border border-black/10"
                  style={{ background: it.swatch }}
                />
              ) : (
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-line text-muted">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
                    <rect x="3" y="3" width="18" height="18" rx="2" />
                    <circle cx="9" cy="9" r="2" />
                    <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
                  </svg>
                </span>
              )
            ) : (
              <img
                src={it.image}
                alt={it.name}
                loading="lazy"
                onError={() => onFail(it.image)}
                className="h-8 w-8 shrink-0 rounded-lg border border-black/10 object-cover"
              />
            )}
            <span className="min-w-0">
              <span className="block truncate text-xs font-medium leading-tight text-ink">
                {it.name}
              </span>
              {it.size && <span className="block text-[10px] text-muted">{it.size}</span>}
            </span>
          </button>
        );
      })}
    </div>
  );
}

function Spinner({ large }: { large?: boolean }) {
  const size = large ? 32 : 16;
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      className="animate-spin text-current"
    >
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" opacity="0.2" />
      <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}
