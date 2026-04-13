import { redirect } from "next/navigation"

/** Compatibilidad: la ruta canónica es `/inicio`. */
export default function OperacionalLegacyPage() {
  redirect("/inicio")
}
