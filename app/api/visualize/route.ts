import { NextRequest, NextResponse } from "next/server";
import { readFileSync } from "fs";
import { join } from "path";
import { getFoundation } from "@/lib/foundations";
import { getDecor, type DecorItem } from "@/lib/decor";
import { getFrame } from "@/lib/frames";
import { getColumn } from "@/lib/columns";
import { getBelt } from "@/lib/belts";
import { getBracket } from "@/lib/brackets";
import { getTermopanel } from "@/lib/termopanels";
import { getFacadeColor } from "@/lib/facadecolors";
import { getClientIp, rateLimit } from "@/lib/ratelimit";

export const runtime = "nodejs";
export const maxDuration = 60;

const MODEL = process.env.GEMINI_IMAGE_MODEL || "gemini-3.1-flash-image";
const MAX_IMAGE_CHARS = 8 * 1024 * 1024; // ~8 МБ base64 — серверный предел

// Максимум фото-референсов в ОДНОМ запросе к Gemini (не считая IMAGE 1 = дом).
// Много референсов → модель «галлюцинирует» (мешает детали разных картинок).
// Всё сверх лимита уходит ТЕКСТОВОЙ подсказкой (hint), а не картинкой.
const MAX_REFERENCE_IMAGES = 4;

// Все фото-референсы лежат в public/references/<папка>/<id>.jpg
const REF_ROOT = "references";

// Предупреждение при старте, если ключ не задан (билд не роняем).
if (!process.env.GEMINI_API_KEY) {
  console.warn("[security] GEMINI_API_KEY не задан — визуализация работать не будет.");
}

// id из каталога: только [a-z0-9-]. Иначе null (не падаем, игнорируем).
function cleanId(id?: string | null): string | null {
  return typeof id === "string" && /^[a-z0-9-]+$/.test(id) ? id : null;
}

interface Body {
  image?: string; // фото дома, base64 (без префикса data:)
  mimeType?: string; // напр. image/jpeg
  foundationId?: string | null; // id отделки цоколя (null = без цоколя)
  decorIds?: string[]; // id выбранного декора (мультивыбор)
  frameId?: string | null; // id обрамления окон (null = без обрамления)
  frameColor?: string; // цвет обрамления: "white" | "yellow"
  facadeColorId?: string | null; // id цвета краски фасада (none = как есть)
  columnId?: string | null; // id угловой колонны (null = без колонн)
  beltId?: string | null; // id межэтажного пояса (null = без пояса)
  bracketId?: string | null; // id кронштейна (null = без кронштейна)
  termopanelId?: string | null; // id термопанельной планки (null = без)
  comment?: string; // доп. комментарий пользователя
}

type ImageAsset = { data: string; mimeType: string; bytes: number };

// 1) Приоритет: читаем картинку-референс с диска (благодаря outputFileTracingIncludes
//    файлы попадают в serverless-бандл на Vercel). folder — папка в public/.
function loadAssetFromDisk(folder: string, id: string): ImageAsset | null {
  try {
    const filePath = join(process.cwd(), "public", REF_ROOT, folder, `${id}.jpg`);
    const buf = readFileSync(filePath);
    console.log(`${folder} loaded (disk): ${id}, ${buf.length} bytes`);
    return { data: buf.toString("base64"), mimeType: "image/jpeg", bytes: buf.length };
  } catch {
    return null; // файла нет в бандле
  }
}

// 2) Подстраховка: если файла нет в бандле — тянем по публичному URL.
async function loadAssetFromUrl(
  folder: string,
  id: string,
  origin: string | null
): Promise<ImageAsset | null> {
  if (!origin) return null;
  try {
    const res = await fetch(`${origin}/${REF_ROOT}/${folder}/${id}.jpg`);
    if (!res.ok) return null;
    const buf = Buffer.from(await res.arrayBuffer());
    console.log(`${folder} loaded (url): ${id}, ${buf.length} bytes`);
    return { data: buf.toString("base64"), mimeType: "image/jpeg", bytes: buf.length };
  } catch {
    return null;
  }
}

// Диск → URL-фолбэк одной функцией.
async function loadAsset(
  folder: string,
  id: string,
  origin: string | null
): Promise<ImageAsset | null> {
  const disk = loadAssetFromDisk(folder, id);
  if (disk) return disk;
  return await loadAssetFromUrl(folder, id, origin);
}

// basename без расширения: "/frames/set-side.jpg" → "set-side"
const baseId = (p: string) => p.split("/").pop()!.replace(/\.jpg$/i, "");

// Определяем публичный origin запроса (для фолбэка)
function getOrigin(req: NextRequest): string | null {
  const host = req.headers.get("host");
  if (!host) return null;
  const proto =
    req.headers.get("x-forwarded-proto") ||
    (host.startsWith("localhost") || host.startsWith("127.") ? "http" : "https");
  return `${proto}://${host}`;
}

export async function POST(req: NextRequest) {
  // Rate limit: не более 10 запросов с одного IP за 60 сек (защита Gemini-денег).
  const rl = rateLimit(`visualize:${getClientIp(req)}`, 10, 60_000);
  if (!rl.ok) {
    return NextResponse.json(
      { error: "Слишком много запросов, подождите" },
      { status: 429, headers: { "Retry-After": String(rl.retryAfter) } }
    );
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "Сервис недоступен." }, { status: 500 });
  }

  // Только JSON.
  if (!(req.headers.get("content-type") || "").includes("application/json")) {
    return NextResponse.json({ error: "Некорректный запрос." }, { status: 400 });
  }

  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ error: "Некорректный запрос." }, { status: 400 });
  }

  const { image, frameColor, comment } = body;

  // image обязателен, должен быть строкой base64.
  if (typeof image !== "string" || !/^[A-Za-z0-9+/=\s]+$/.test(image) || image.length < 8) {
    return NextResponse.json(
      { error: "Не передано изображение дома." },
      { status: 400 }
    );
  }
  // Серверный предел размера (доп. к клиентскому сжатию).
  if (image.length > MAX_IMAGE_CHARS) {
    return NextResponse.json({ error: "Файл слишком большой" }, { status: 413 });
  }

  // id — только из каталогов и только [a-z0-9-]; иначе игнорируем.
  const foundationId = cleanId(body.foundationId);
  const frameId = cleanId(body.frameId);
  const facadeColorId = cleanId(body.facadeColorId);
  const columnId = cleanId(body.columnId);
  const beltId = cleanId(body.beltId);
  const bracketId = cleanId(body.bracketId);
  const termopanelId = cleanId(body.termopanelId);
  const decorIds = Array.isArray(body.decorIds)
    ? (body.decorIds.map(cleanId).filter(Boolean) as string[])
    : [];

  const mimeType =
    typeof body.mimeType === "string" && /^image\/[a-z0-9.+-]+$/i.test(body.mimeType)
      ? body.mimeType
      : "image/jpeg";
  // Цвет обрамления: none = не форсировать (берётся из референс-фото).
  const frameColorText =
    frameColor === "white" ? "white" : frameColor === "beige" ? "beige/cream" : null;
  // Фраза про цвет для веток с фото-референсом и для текстового fallback.
  const trimColorRef = frameColorText
    ? ` The trim color MUST be ${frameColorText}.`
    : ` Keep the trim color exactly as shown in the reference image.`;
  const trimColorHint = frameColorText ? ` Trim color: ${frameColorText}.` : "";

  const foundation = getFoundation(foundationId);
  const decors = (decorIds ?? [])
    .map(getDecor)
    .filter((d): d is DecorItem => Boolean(d));

  // Цоколь — фото-референс (если есть файл), иначе fallback по hint.
  let foundationAsset: ImageAsset | null = null;
  if (foundation) {
    foundationAsset = loadAssetFromDisk("foundations", foundation.id);
    if (!foundationAsset) {
      foundationAsset = await loadAssetFromUrl("foundations", foundation.id, getOrigin(req));
    }
  }

  // Обрамление окон — одиночный референс ИЛИ комплект из 3 профилей.
  const frame = getFrame(frameId);
  const origin = getOrigin(req);
  let frameAsset: ImageAsset | null = null;
  let frameSet: { side: ImageAsset; top: ImageAsset; bottom: ImageAsset } | null = null;
  if (frame?.setImages) {
    const [s, t, b] = await Promise.all([
      loadAsset("frames", baseId(frame.setImages.side), origin),
      loadAsset("frames", baseId(frame.setImages.top), origin),
      loadAsset("frames", baseId(frame.setImages.bottom), origin),
    ]);
    if (s && t && b) frameSet = { side: s, top: t, bottom: b };
  } else if (frame) {
    frameAsset = await loadAsset("frames", frame.id, origin);
  }

  // Угловые колонны — фото-референс (если есть файл), иначе fallback по hint.
  const column = getColumn(columnId);
  let columnAsset: ImageAsset | null = null;
  if (column) {
    columnAsset = loadAssetFromDisk("columns", column.id);
    if (!columnAsset) {
      columnAsset = await loadAssetFromUrl("columns", column.id, getOrigin(req));
    }
  }

  // Межэтажный пояс — фото-референс (если есть файл), иначе fallback по hint.
  const belt = getBelt(beltId);
  let beltAsset: ImageAsset | null = null;
  if (belt) {
    beltAsset = loadAssetFromDisk("belts", belt.id);
    if (!beltAsset) {
      beltAsset = await loadAssetFromUrl("belts", belt.id, getOrigin(req));
    }
  }

  // Кронштейны — фото-референс (если есть файл), иначе fallback по hint.
  const bracket = getBracket(bracketId);
  let bracketAsset: ImageAsset | null = null;
  if (bracket) {
    bracketAsset = loadAssetFromDisk("brackets", bracket.id);
    if (!bracketAsset) {
      bracketAsset = await loadAssetFromUrl("brackets", bracket.id, getOrigin(req));
    }
  }

  // Термопанельные планки вокруг окон — фото-референс (иначе fallback по hint).
  const termopanel = getTermopanel(termopanelId);
  let termopanelAsset: ImageAsset | null = null;
  if (termopanel) {
    termopanelAsset = loadAssetFromDisk("termopanels", termopanel.id);
    if (!termopanelAsset) {
      termopanelAsset = await loadAssetFromUrl("termopanels", termopanel.id, getOrigin(req));
    }
  }

  // ── Лимит фото-референсов (анти-галлюцинации) ──
  // Держим не больше MAX_REFERENCE_IMAGES картинок-референсов на запрос.
  // frameSet = 3 картинки, остальные = 1. Что не влезло — обнуляем: тогда ниже
  // сработает текстовый fallback (по hint). Приоритет — самое заметное на фасаде:
  // материал стен → обрамление → цоколь → колонны → пояс → кронштейны.
  let refBudget = MAX_REFERENCE_IMAGES;
  const takeRef = (cost: number): boolean => {
    if (refBudget >= cost) {
      refBudget -= cost;
      return true;
    }
    return false;
  };
  if (termopanelAsset && !takeRef(1)) termopanelAsset = null;
  if (frameSet && !takeRef(3)) frameSet = null;
  if (frameAsset && !takeRef(1)) frameAsset = null;
  if (foundationAsset && !takeRef(1)) foundationAsset = null;
  if (columnAsset && !takeRef(1)) columnAsset = null;
  if (beltAsset && !takeRef(1)) beltAsset = null;
  if (bracketAsset && !takeRef(1)) bracketAsset = null;

  const userComment = (comment || "").trim();

  // Референс-картинки по порядку: IMAGE 1 = дом, далее выбранные референсы
  // (обрамление, цоколь, колонна, пояс, кронштейн, термопанель-материал стен).
  // Номера вычисляем динамически, чтобы промпт ссылался на фактическую позицию.
  const imageParts: any[] = [
    { inline_data: { mime_type: mimeType, data: image } }, // IMAGE 1 — дом
  ];
  let imgCount = 1;
  let frameIndex = 0;
  let sideIndex = 0;
  let topIndex = 0;
  let bottomIndex = 0;
  let foundationIndex = 0;
  let columnIndex = 0;
  let beltIndex = 0;
  if (frameSet) {
    // комплект = 3 картинки: боковой, верхний, нижний
    sideIndex = ++imgCount;
    imageParts.push({ inline_data: { mime_type: frameSet.side.mimeType, data: frameSet.side.data } });
    topIndex = ++imgCount;
    imageParts.push({ inline_data: { mime_type: frameSet.top.mimeType, data: frameSet.top.data } });
    bottomIndex = ++imgCount;
    imageParts.push({ inline_data: { mime_type: frameSet.bottom.mimeType, data: frameSet.bottom.data } });
  } else if (frameAsset) {
    frameIndex = ++imgCount; // IMAGE 3 (или далее)
    imageParts.push({ inline_data: { mime_type: frameAsset.mimeType, data: frameAsset.data } });
  }
  if (foundationAsset) {
    foundationIndex = ++imgCount; // следующий индекс после обрамления
    imageParts.push({ inline_data: { mime_type: foundationAsset.mimeType, data: foundationAsset.data } });
  }
  if (columnAsset) {
    columnIndex = ++imgCount; // после цоколя
    imageParts.push({ inline_data: { mime_type: columnAsset.mimeType, data: columnAsset.data } });
  }
  if (beltAsset) {
    beltIndex = ++imgCount; // после колонны
    imageParts.push({ inline_data: { mime_type: beltAsset.mimeType, data: beltAsset.data } });
  }
  let bracketIndex = 0;
  if (bracketAsset) {
    bracketIndex = ++imgCount; // после пояса
    imageParts.push({ inline_data: { mime_type: bracketAsset.mimeType, data: bracketAsset.data } });
  }
  let termopanelIndex = 0;
  if (termopanelAsset) {
    termopanelIndex = ++imgCount; // последний референс (после кронштейна)
    imageParts.push({ inline_data: { mime_type: termopanelAsset.mimeType, data: termopanelAsset.data } });
  }

  // Базовый промпт: IMAGE 1 = дом. Материал стен задаётся термопанелью (если выбрана).
  let prompt =
    `CRITICAL STRUCTURAL LOCK — THIS IS THE MOST IMPORTANT RULE:\n` +
    `IMAGE 1 is the real house to renovate. You MUST keep its EXACT structure 100% ` +
    `unchanged: same number of floors, same roof shape and position, same number, size ` +
    `and position of ALL windows and doors, same walls layout, same building height and ` +
    `proportions, same camera angle and perspective, same background. Do NOT add floors, ` +
    `do NOT add or remove windows, do NOT change the roof, do NOT redesign the building. ` +
    `You are ONLY applying surface finishes (wall cladding, trim, plinth, columns) onto ` +
    `the EXISTING house. The result must be instantly recognizable as the SAME house from ` +
    `IMAGE 1, just with new facade finishing. If in doubt, keep IMAGE 1 as-is and change ` +
    `less. NEVER generate a different building.\n\n` +
    `Facade redesign visualization.\n` +
    `IMAGE 1 = the house to redesign.\n\n` +
    `Keep strictly unchanged: building shape, all windows and window frames, doors, ` +
    `the veranda/porch structure, railings, stairs, roof, sky, ground, plants and ` +
    `background. Same camera angle. Photorealistic, natural daylight, high quality.`;

  // Краска фасада — цвет стен (поверх/вместе с материалом стен)
  const facadeColor = getFacadeColor(facadeColorId);
  if (facadeColor?.hint) {
    prompt +=
      `\n\nPaint the facade walls in ${facadeColor.hint}. Apply this wall color across the ` +
      `house walls. If a wall cladding/material is also applied, tint/paint it toward this ` +
      `color while keeping the surface relief.`;
  }

  // Цоколь — фото-референс (IMAGE {foundationIndex}) либо текст (fallback по hint)
  if (foundation && foundationAsset) {
    prompt +=
      `\n\nIMAGE ${foundationIndex} shows the plinth/basement panel texture. Apply this panel ` +
      `texture ONLY to the narrow plinth strip at the very bottom of the house WALLS — a ` +
      `horizontal band about 0.4-0.5 meters high directly under the wall cladding, right above ` +
      `the ground. CRITICAL: do NOT apply this texture to the ground, pavement, walkway, soil, ` +
      `tiles, stairs or any horizontal surface in front of or around the house. The plinth is ` +
      `ONLY the vertical base of the building walls. Everything below the wall base (ground, ` +
      `paving, foreground) must stay EXACTLY as in IMAGE 1, untouched. Copy only the panel ` +
      `surface from IMAGE ${foundationIndex}, ignore its background.`;
  } else if (foundation?.hint) {
    prompt +=
      `\n\nAlso clad the base/plinth (about 0.4-0.5 m high) along the bottom of the ` +
      `walls in ${foundation.hint}, with a crisp clean top edge. This plinth is an intended addition.`;
  }

  // Декор — разрешённое добавление (мультивыбор)
  if (decors.length) {
    prompt +=
      `\n\nAdd these facade decorative elements: ${decors.map((d) => d.hint).join(", ")}. ` +
      `Render them realistically at natural scale.`;
  }

  // Обрамление окон — комплект из 3 профилей, одиночный референс, или текст (fallback).
  if (frame && frameSet) {
    prompt +=
      `\n\nThese reference images show a window trim SET: IMAGE ${sideIndex} = side molding, ` +
      `IMAGE ${topIndex} = top cornice, IMAGE ${bottomIndex} = bottom sill. Apply ALL THREE ` +
      `around every window — side moldings on left/right, cornice on top, sill at the bottom — ` +
      `forming a complete classic frame.${trimColorRef} Keep window glass unchanged.`;
  } else if (frame && frameAsset) {
    prompt +=
      `\n\nAdd the same window trim as shown in IMAGE ${frameIndex} around every window. ` +
      `Replicate the EXACT profile and shape from IMAGE ${frameIndex}.${trimColorRef} IMPORTANT: ` +
      `ignore the window glass, curtains and interior visible in IMAGE ${frameIndex} — copy ONLY ` +
      `the decorative trim frame (surround, pilasters, cornice, sill), not the glass or what is ` +
      `behind it. Keep the house's own windows and glass from IMAGE 1 unchanged.`;
  } else if (frame) {
    prompt +=
      `\n\nAdd decorative window trim around EVERY window of the house: ${frame.hint}.` +
      `${trimColorHint} Realistic scale. Only add the frame around each window — ` +
      `do not cover or change the window glass.`;
  }

  // Угловые колонны — по фото-референсу (IMAGE {columnIndex}) или по тексту (fallback).
  if (column && columnAsset) {
    prompt +=
      `\n\nIMAGE ${columnIndex} shows a decorative corner column/pilaster. Apply this exact ` +
      `column design to the OUTER CORNERS of the house (vertical columns covering the building ` +
      `corners), matching the panels, capital and color from IMAGE ${columnIndex}. Keep the wall ` +
      `travertine and windows unchanged. Place columns ONLY on the building corners, ` +
      `not on windows. Ignore background in IMAGE ${columnIndex}, copy only the column.`;
  } else if (column) {
    prompt +=
      `\n\nAdd decorative corner columns/pilasters on the OUTER CORNERS of the house: ${column.hint}. ` +
      `Place them ONLY on the building corners, not on windows. Keep the wall travertine ` +
      `and windows unchanged. White/cream, realistic scale.`;
  }

  // Межэтажный пояс — по фото-референсу (IMAGE {beltIndex}) или по тексту (fallback).
  if (belt && beltAsset) {
    prompt +=
      `\n\nIMAGE ${beltIndex} shows a horizontal inter-floor belt/molding. Add this exact belt ` +
      `profile as a HORIZONTAL decorative band running across the facade BETWEEN the floors ` +
      `(at the boundary between the 1st and 2nd floor), matching the profile and color from ` +
      `IMAGE ${beltIndex}. Keep it a thin horizontal band only. Do NOT put it on windows, ` +
      `corners, roof or ground. Ignore background in IMAGE ${beltIndex}, copy only the molding profile.`;
  } else if (belt) {
    prompt +=
      `\n\nAdd a horizontal inter-floor decorative belt/molding running across the facade ` +
      `between the 1st and 2nd floor: ${belt.hint}. Keep it a thin horizontal band only. ` +
      `Do NOT put it on windows, corners, roof or ground.`;
  }

  // Кронштейны — по фото-референсу (IMAGE {bracketIndex}) или по тексту (fallback).
  if (bracket && bracketAsset) {
    prompt +=
      `\n\nIMAGE ${bracketIndex} shows a decorative bracket/corbel. Add small brackets of ` +
      `EXACTLY this design (matching shape and color from IMAGE ${bracketIndex}) at the TOP ` +
      `CORNERS of each window trim — where the side pilasters meet the top cornice, left and ` +
      `right of every window. Do NOT place them under the roof, on walls or building corners ` +
      `— ONLY at the upper sides of window frames. Small, symmetric, natural scale. Ignore ` +
      `background in IMAGE ${bracketIndex}, copy only the bracket.`;
  } else if (bracket) {
    prompt +=
      `\n\nAdd small decorative brackets/corbels (${bracket.hint}) at the TOP CORNERS of each ` +
      `window trim — where the side pilasters meet the top cornice, left and right of every ` +
      `window. Do NOT place them under the roof, on walls or building corners — ONLY at the ` +
      `upper sides of window frames. Small, symmetric, natural scale.`;
  }

  // Термопанель — материал/фактура, наносимая на СТЕНЫ дома.
  if (termopanel && termopanelAsset) {
    prompt +=
      `\n\nIMAGE ${termopanelIndex} shows a thermopanel facade cladding material (its texture, ` +
      `color and surface pattern). Use it as the MAIN WALL MATERIAL: cover the ENTIRE facade ` +
      `wall surface of the house in IMAGE 1 with this thermopanel, completely replacing the ` +
      `existing brick or plaster. The panels install as large horizontal blocks across the ` +
      `whole wall — apply the texture and color from IMAGE ${termopanelIndex} at realistic ` +
      `architectural scale over all wall areas. Keep windows, roof, doors, balcony, stairs and ` +
      `surroundings exactly as in IMAGE 1. This is full facade wall cladding, not a small ` +
      `insert — the whole wall must be covered. Ignore any background in IMAGE ${termopanelIndex}, ` +
      `copy only the panel material.`;
  } else if (termopanel) {
    prompt +=
      `\n\nCover all the plaster/wall surfaces of the house with a thermopanel wall cladding ` +
      `material (${termopanel.hint}). Apply it as the main wall facade cladding at realistic ` +
      `scale. Keep windows, roof, doors and surroundings unchanged.`;
  }

  // Доп. инструкции пользователя
  if (userComment) {
    prompt += `\n\nAdditional user instructions (follow them): ${userComment}`;
  }

  // contents.parts = текст + все референс-картинки по порядку
  const parts: any[] = [{ text: prompt }, ...imageParts];

  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${apiKey}`;

  const payload = {
    contents: [{ role: "user", parts }],
    generationConfig: {
      responseModalities: ["IMAGE"],
    },
  };

  try {
    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const text = await res.text();
      console.error("Gemini error:", res.status, text);
      let msg = "Ошибка генерации. Попробуйте ещё раз.";
      if (res.status === 400) msg = "Запрос отклонён моделью. Проверьте фото и попробуйте снова.";
      if (res.status === 401 || res.status === 403) msg = "Неверный или недействительный API-ключ Gemini.";
      if (res.status === 413) msg = "Изображение слишком большое. Загрузите фото меньшего размера.";
      if (res.status === 429) msg = "Превышен лимит запросов. Подождите немного и попробуйте снова.";
      return NextResponse.json({ error: msg }, { status: 502 });
    }

    const data = await res.json();
    const parts: any[] =
      data?.candidates?.[0]?.content?.parts ?? [];

    const imagePart = parts.find(
      (p) => p?.inline_data?.data || p?.inlineData?.data
    );
    const outData =
      imagePart?.inline_data?.data || imagePart?.inlineData?.data || null;
    const outMime =
      imagePart?.inline_data?.mime_type ||
      imagePart?.inlineData?.mimeType ||
      "image/png";

    if (!outData) {
      // Модель могла вернуть только текст (отказ / описание)
      const textPart = parts.find((p) => p?.text)?.text;
      console.error("Gemini вернул без изображения:", textPart);
      return NextResponse.json(
        {
          error:
            "Модель не вернула изображение. Попробуйте другое фото или цвет.",
        },
        { status: 502 }
      );
    }

    return NextResponse.json({
      image: outData,
      mimeType: outMime,
    });
  } catch (err) {
    console.error("Visualize fatal:", err);
    return NextResponse.json(
      { error: "Сервис визуализации недоступен. Попробуйте позже." },
      { status: 500 }
    );
  }
}
