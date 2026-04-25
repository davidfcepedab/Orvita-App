import { redirect } from "next/navigation"

/**
 * La vista de operaciones de salud e import Atajo vive en `/health` (p. ej. orvita.app/health).
 * Mantener esta ruta evita roturas de enlaces antiguos y atajos de navegación.
 */
export default function SistemaPage() {
  redirect("/health")
}
