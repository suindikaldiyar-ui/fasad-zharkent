import { redirect } from "next/navigation";

// Корень → вкладка «Калькулятор».
export default function Home() {
  redirect("/calculator");
}
