import type { Metadata } from "next";
import { Manrope } from "next/font/google";
import "./globals.css";

const manrope = Manrope({
  subsets: ["latin", "cyrillic"],
  variable: "--font-manrope",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Fasad Zharkent · Калькулятор фасада + AI-визуализация",
  description:
    "Fasad Zharkent (г. Жаркент) — расчёт сметы фасада и AI-визуализация дома.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ru" className={manrope.variable}>
      <body className="font-sans antialiased">{children}</body>
    </html>
  );
}
