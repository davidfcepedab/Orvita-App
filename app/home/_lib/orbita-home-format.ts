import type { FlowColor } from "./orbita-home-types"

export function flowToneClasses(color: FlowColor) {
  switch (color) {
    case "green":
      return {
        ring: "ring-1 ring-emerald-400/25",
        chip: "bg-emerald-400/10 text-emerald-200 border-emerald-400/20",
        glow: "shadow-[0_0_0_1px_rgba(52,211,153,0.18),0_0_30px_rgba(52,211,153,0.08)]",
      }
    case "yellow":
      return {
        ring: "ring-1 ring-amber-400/25",
        chip: "bg-amber-400/10 text-amber-200 border-amber-400/20",
        glow: "shadow-[0_0_0_1px_rgba(251,191,36,0.18),0_0_30px_rgba(251,191,36,0.08)]",
      }
    case "red":
    default:
      return {
        ring: "ring-1 ring-rose-400/25",
        chip: "bg-rose-400/10 text-rose-200 border-rose-400/20",
        glow: "shadow-[0_0_0_1px_rgba(251,113,133,0.18),0_0_30px_rgba(251,113,133,0.08)]",
      }
  }
}

export function impactClasses(impact: "alto" | "medio") {
  if (impact === "alto") {
    return "bg-rose-400/10 text-rose-200 border-rose-400/20"
  }
  return "bg-sky-400/10 text-sky-200 border-sky-400/20"
}

export function pressureClasses(level: "alta" | "media") {
  if (level === "alta") return "bg-rose-400/10 text-rose-200 border-rose-400/20"
  return "bg-amber-400/10 text-amber-200 border-amber-400/20"
}

export function energyWindowDot(window: "alta" | "media" | "baja") {
  if (window === "alta") return "bg-emerald-400"
  if (window === "media") return "bg-amber-400"
  return "bg-slate-500"
}

export function formatBogotaDateParts(date: Date) {
  const weekday = date.toLocaleDateString("es-CO", { weekday: "long", timeZone: "America/Bogota" })
  const day = date.toLocaleDateString("es-CO", { day: "2-digit", month: "long", year: "numeric", timeZone: "America/Bogota" })
  return { weekday, day }
}

export function greetingForWeekday(weekdayLower: string) {
  // Microcopy deliberado: directo, cálido, sin ruido.
  if (weekdayLower.includes("lunes")) return "Buen lunes"
  if (weekdayLower.includes("martes")) return "Buen martes"
  if (weekdayLower.includes("miércoles") || weekdayLower.includes("miercoles")) return "Buen miércoles"
  if (weekdayLower.includes("jueves")) return "Buen jueves"
  if (weekdayLower.includes("viernes")) return "Buen viernes"
  if (weekdayLower.includes("sábado") || weekdayLower.includes("sabado")) return "Buen sábado"
  return "Buen domingo"
}

