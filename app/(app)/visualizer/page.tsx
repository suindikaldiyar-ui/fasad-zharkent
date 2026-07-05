"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Visualizer, { type VisualizerInitial } from "@/components/Visualizer";

// Каталожная категория (?cat=) → какое поле визуализатора предзаполнить.
function mapInitial(cat: string | null, id: string | null): VisualizerInitial | undefined {
  if (!cat || !id) return undefined;
  switch (cat) {
    case "foundations":
      return { foundationId: id };
    case "frames":
      return { frameId: id };
    case "columns":
      return { columnId: id };
    case "belts":
      return { beltId: id };
    case "brackets":
      return { bracketId: id };
    case "termopanels":
      return { termopanelId: id };
    case "amk":
      return { amkId: id };
    case "decor":
      return { decorIds: [id] };
    case "facadecolors":
      return { facadeColorId: id };
    default:
      return undefined;
  }
}

function VisualizerWithPreselect() {
  const sp = useSearchParams();
  const initial = mapInitial(sp.get("cat"), sp.get("id"));
  return <Visualizer initial={initial} />;
}

export default function VisualizerPage() {
  return (
    <Suspense fallback={<Visualizer />}>
      <VisualizerWithPreselect />
    </Suspense>
  );
}
