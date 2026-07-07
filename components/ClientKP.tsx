"use client";

import { useState } from "react";
import type { Estimate } from "@/lib/calc";
import { fmtMoney, fmtNum } from "@/lib/calc";
import { COMPANY } from "@/lib/company";

interface Props {
  estimate: Estimate;
}

// Нормализация телефона клиента → чистые цифры для wa.me
function normalizePhone(raw: string): string {
  let d = raw.replace(/[\s()\-]/g, ""); // убрать пробелы, скобки, дефисы
  d = d.replace(/^\+/, ""); // убрать ведущий +
  d = d.replace(/\D/g, ""); // оставить только цифры
  if (d.startsWith("8")) d = "7" + d.slice(1); // 8… → 7…
  return d;
}

export default function ClientKP({ estimate }: Props) {
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState("");
  const [error, setError] = useState<string | null>(null);

  // Текст КП собираем из ТОЙ ЖЕ сметы, что на экране
  function buildText(): string {
    const lines = estimate.items
      .map((it) =>
        it.bonus
          ? `• ${it.name} — БОНУС (в подарок) 🎁`
          : `• ${it.name} — ${it.detail} — ${fmtMoney(it.total)}`
      )
      .join("\n");

    return (
      `Коммерческое предложение — ${COMPANY.name}\n` +
      `──────────────────────\n` +
      `Клиент: ${name.trim() || "—"}\n` +
      `Адрес объекта: ${address.trim() || "—"}\n\n` +
      `Расчёт фасада (термопанель, травертин):\n` +
      `${lines}\n` +
      `──────────────────────\n` +
      `Термопанель (чистая площадь): ${fmtNum(estimate.panelArea)} м²\n` +
      `Фундамент (материал + краска): ${fmtNum(estimate.foundationArea)} м²\n` +
      `Общая площадь: ${fmtNum(estimate.totalArea)} м²\n\n` +
      `ИТОГО: ${fmtMoney(estimate.total)}\n` +
      `Цена за 1 м²: ${estimate.totalArea > 0 ? fmtMoney(estimate.pricePerM2) : "—"}\n\n` +
      `Наш контакт: ${COMPANY.phone}\n\n` +
      `* Цены действительны на момент расчёта.`
    );
  }

  function sendWhatsApp() {
    const num = normalizePhone(phone);
    if (num.length < 10) {
      setError("Введите телефон клиента");
      return;
    }
    setError(null);
    const url = `https://wa.me/${num}?text=${encodeURIComponent(buildText())}`;
    window.open(url, "_blank");
  }

  const fields = [
    {
      label: "Имя клиента",
      value: name,
      set: setName,
      type: "text",
      inputMode: "text" as const,
      placeholder: "напр.: Айгуль",
    },
    {
      label: "Адрес объекта",
      value: address,
      set: setAddress,
      type: "text",
      inputMode: "text" as const,
      placeholder: "напр.: г. …, ул. …",
    },
    {
      label: "Телефон клиента",
      value: phone,
      set: setPhone,
      type: "tel",
      inputMode: "tel" as const,
      placeholder: "+7 700 000 00 00",
    },
  ];

  return (
    <div className="rounded-2xl border border-line bg-surface p-5 shadow-card sm:p-6 no-print">
      <h2 className="mb-1 flex items-center gap-2.5 text-lg font-bold text-ink">
        <span className="h-5 w-1 rounded-full bg-gradient-to-b from-gold to-goldLight" />
        Данные клиента
      </h2>
      <p className="mb-5 text-sm text-muted">
        Отправьте готовое КП клиенту в WhatsApp
      </p>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {fields.map((f) => (
          <label key={f.label} className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-muted">{f.label}</span>
            <input
              type={f.type}
              inputMode={f.inputMode}
              value={f.value}
              placeholder={f.placeholder}
              onChange={(e) => {
                f.set(e.target.value);
                if (error) setError(null);
              }}
              className="w-full rounded-xl border border-line bg-canvas px-3.5 py-2.5 text-base font-semibold text-ink outline-none transition placeholder:text-muted/40 focus:border-gold focus:ring-2 focus:ring-gold/30"
            />
          </label>
        ))}
      </div>

      <button
        type="button"
        onClick={sendWhatsApp}
        className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-br from-gold to-goldLight px-4 py-3 text-sm font-bold text-stone shadow-gold transition hover:brightness-110 sm:w-auto"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
          <path d="M17.5 14.4c-.3-.15-1.77-.87-2.04-.97-.27-.1-.47-.15-.67.15-.2.3-.77.97-.94 1.17-.17.2-.35.22-.65.07-.3-.15-1.26-.46-2.4-1.48-.89-.79-1.49-1.77-1.66-2.07-.17-.3-.02-.46.13-.61.13-.13.3-.35.45-.52.15-.17.2-.3.3-.5.1-.2.05-.37-.02-.52-.07-.15-.67-1.62-.92-2.22-.24-.58-.49-.5-.67-.51h-.57c-.2 0-.52.07-.8.37-.27.3-1.04 1.02-1.04 2.48s1.07 2.88 1.22 3.08c.15.2 2.1 3.2 5.08 4.49.71.31 1.26.49 1.69.63.71.22 1.36.19 1.87.12.57-.09 1.77-.72 2.02-1.42.25-.7.25-1.29.17-1.42-.07-.13-.27-.2-.57-.35zM12 2C6.48 2 2 6.48 2 12c0 1.85.5 3.58 1.38 5.07L2 22l5.05-1.33A9.94 9.94 0 0 0 12 22c5.52 0 10-4.48 10-10S17.52 2 12 2z" />
        </svg>
        Отправить КП клиенту в WhatsApp
      </button>

      {error && (
        <p className="mt-2 text-sm font-medium text-red-400">{error}</p>
      )}
    </div>
  );
}
