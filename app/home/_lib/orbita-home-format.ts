import type { FlowColor } from "./orbita-home-types"

export function flowToneClasses(color: FlowColor) {
  switch (color) {
    case "green":
      return {
        ring: "ring-1 ring-emerald-400/25",
        chip:
          "bg-[color-mix(in_srgb,var(--color-accent-health)_12%,transparent)] " +
          "text-[color-mix(in_srgb,var(--color-accent-health)_82%,var(--color-text-primary))] " +
          "border-[color-mix(in_srgb,var(--color-accent-health)_28%,var(--color-border))]",
        glow: "shadow-[0_0_0_1px_rgba(52,211,153,0.18),0_0_30px_rgba(52,211,153,0.08)]",
      }
    case "yellow":
      return {
        ring: "ring-1 ring-amber-400/25",
        chip:
          "bg-[color-mix(in_srgb,var(--color-accent-warning)_12%,transparent)] " +
          "text-[color-mix(in_srgb,var(--color-accent-warning)_82%,var(--color-text-primary))] " +
          "border-[color-mix(in_srgb,var(--color-accent-warning)_28%,var(--color-border))]",
        glow: "shadow-[0_0_0_1px_rgba(251,191,36,0.18),0_0_30px_rgba(251,191,36,0.08)]",
      }
    case "red":
    default:
      return {
        ring: "ring-1 ring-rose-400/25",
        chip:
          "bg-[color-mix(in_srgb,var(--color-accent-danger)_12%,transparent)] " +
          "text-[color-mix(in_srgb,var(--color-accent-danger)_82%,var(--color-text-primary))] " +
          "border-[color-mix(in_srgb,var(--color-accent-danger)_28%,var(--color-border))]",
        glow: "shadow-[0_0_0_1px_rgba(251,113,133,0.18),0_0_30px_rgba(251,113,133,0.08)]",
      }
  }
}

export function impactClasses(impact: "alto" | "medio") {
  if (impact === "alto") {
    return (
      "bg-[color-mix(in_srgb,var(--color-accent-danger)_14%,transparent)] " +
      "text-[color-mix(in_srgb,var(--color-accent-danger)_78%,var(--color-text-primary))] " +
      "border-[color-mix(in_srgb,var(--color-accent-danger)_28%,var(--color-border))]"
    )
  }
  return (
    "bg-[color-mix(in_srgb,var(--color-accent-finance)_14%,transparent)] " +
    "text-[color-mix(in_srgb,var(--color-accent-finance)_78%,var(--color-text-primary))] " +
    "border-[color-mix(in_srgb,var(--color-accent-finance)_28%,var(--color-border))]"
  )
}

export function pressureClasses(level: "alta" | "media") {
  if (level === "alta") {
    return (
      "bg-[color-mix(in_srgb,var(--color-accent-danger)_14%,transparent)] " +
      "text-[color-mix(in_srgb,var(--color-accent-danger)_78%,var(--color-text-primary))] " +
      "border-[color-mix(in_srgb,var(--color-accent-danger)_28%,var(--color-border))]"
    )
  }
  return (
    "bg-[color-mix(in_srgb,var(--color-accent-warning)_14%,transparent)] " +
    "text-[color-mix(in_srgb,var(--color-accent-warning)_78%,var(--color-text-primary))] " +
    "border-[color-mix(in_srgb,var(--color-accent-warning)_28%,var(--color-border))]"
  )
}

export function energyWindowDot(window: "alta" | "media" | "baja") {
  if (window === "alta") return "bg-emerald-400"
  if (window === "media") return "bg-amber-400"
  return "bg-slate-500"
}

export function formatBogotaDateParts(date: Date, tz = "America/Bogota") {
  const weekday = date.toLocaleDateString("es-CO", { weekday: "long", timeZone: tz })
  const day = date.toLocaleDateString("es-CO", { day: "2-digit", month: "long", year: "numeric", timeZone: tz })
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

