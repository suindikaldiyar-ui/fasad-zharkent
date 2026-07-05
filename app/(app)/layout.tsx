import Hero from "@/components/Hero";
import TabNav from "@/components/TabNav";

// Общий каркас вкладок: hero-логотип + таб-бар над контентом каждой страницы.
export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="min-h-screen">
      <Hero />
      <TabNav />
      <div className="mx-auto max-w-6xl px-5 py-7">{children}</div>
      <footer className="no-print pb-6 pt-2 text-center text-xs text-muted/60">
        Fasad Zharkent · расчёт ориентировочный, уточняется при замере
      </footer>
    </main>
  );
}
