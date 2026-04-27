import type { AutoHealthMetric } from "@/app/hooks/useHealthAutoMetrics"
import { SALUD_SEM } from "@/lib/salud/saludSemanticPalette"
import { saludHexToRgba } from "@/lib/salud/saludThemeStyles"

/** Misma ventana que AppleHealthLuxurySection (>36h = desactualizado). */
export function appleHealthSyncStale(observedAt: string | null | undefined): boolean {
  if (!observedAt) return false
  const ageMs = Date.now() - new Date(observedAt).getTime()
  return Number.isFinite(ageMs) && ageMs > 36 * 60 * 60 * 1000
}

export function formatAppleHealthSyncWhen(iso: string | null | undefined) {
  if (!iso) return "Aún no hay sincronización"
  try {
    return new Intl.DateTimeFormat("es-LA", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(iso))
  } catch {
    return iso
  }
}

/**
 * Variante corta para UI compacta (p. ej. `<summary>` del collapsible en móvil).
 * Misma ventana stale que {@link appleHealthSyncStale}; no altera la lógica de sync.
 */
export function formatAppleHealthSyncWhenShort(iso: string | null | undefined): string {
  if (!iso) return "Sin lectura"
  if (appleHealthSyncStale(iso)) return "Desactualizado"
  const t = new Date(iso).getTime()
  if (!Number.isFinite(t)) return "Sin lectura"
  const ageMs = Date.now() - t
  if (ageMs < 0) return "Sin lectura"
  const hours = Math.floor(ageMs / (60 * 60 * 1000))
  if (hours < 1) {
    const mins = Math.floor(ageMs / (60 * 1000))
    return mins < 5 ? "Al día" : `Hace ${mins} min`
  }
  if (hours < 12) return "Al día"
  return `Hace ${hours} h`
}

export type AppleSyncChip = { label: string; fg: string; bg: string }

/** Frescura del último `observed_at` (misma ventana stale 36h). */
export type AppleSyncFreshness = "live" | "recent" | "aging" | "stale" | "none"

export function appleHealthSyncFreshness(observedAt: string | null | undefined): AppleSyncFreshness {
  if (!observedAt) return "none"
  if (appleHealthSyncStale(observedAt)) return "stale"
  const ageMs = Date.now() - new Date(observedAt).getTime()
  if (!Number.isFinite(ageMs) || ageMs < 0) return "none"
  if (ageMs < 3 * 60 * 60 * 1000) return "live"
  if (ageMs < 12 * 60 * 60 * 1000) return "recent"
  return "aging"
}

export function appleHealthSyncAgeHint(observedAt: string | null | undefined): string {
  if (!observedAt) return ""
  const t = new Date(observedAt).getTime()
  if (!Number.isFinite(t)) return ""
  const ageMs = Date.now() - t
  if (ageMs < 0) return ""
  const mins = Math.floor(ageMs / (60 * 1000))
  const hours = Math.floor(ageMs / (60 * 60 * 1000))
  if (mins < 60) return `dato de hace ~${mins} min`
  if (hours < 48) return `dato de hace ~${hours} h`
  return "dato antiguo"
}

export type AppleHeroSyncLine = {
  /** Texto corto coloreado: estado del sync. */
  statusText: string
  /** Resto de la línea (fecha + cercanía), tono neutro. */
  detailText: string
  /** Color del estado (hex semántico). */
  statusColor: string
}

/** Línea bajo el brief del día: estado en color + detalle con frescura del dato. */
export function buildAppleHealthHeroSyncLine(
  latest: AutoHealthMetric | null | undefined,
  stale: boolean,
): AppleHeroSyncLine {
  if (!latest?.observed_at) {
    return {
      statusText: "Sin datos recientes",
      detailText: " · Usa el atajo de iPhone y toca Actualizar lectura",
      statusColor: SALUD_SEM.risk,
    }
  }
  const when = new Intl.DateTimeFormat("es-LA", { dateStyle: "short", timeStyle: "short" }).format(new Date(latest.observed_at))
  const fresh = appleHealthSyncFreshness(latest.observed_at)
  const hint = appleHealthSyncAgeHint(latest.observed_at)
  const detailCore = hint ? `${when} · ${hint}` : when

  if (stale || fresh === "stale") {
    return {
      statusText: "Datos desactualizados",
      detailText: ` · ${detailCore}`,
      statusColor: SALUD_SEM.risk,
    }
  }
  if (fresh === "aging") {
    return {
      statusText: "Datos aceptables",
      detailText: ` · ${detailCore}`,
      statusColor: SALUD_SEM.warn,
    }
  }
  if (fresh === "recent") {
    return {
      statusText: "Al día",
      detailText: ` · ${detailCore}`,
      statusColor: SALUD_SEM.ok,
    }
  }
  return {
    statusText: "Al día",
    detailText: ` · ${detailCore}`,
    statusColor: SALUD_SEM.ok,
  }
}

/** Chip corto para `<summary>` colapsado (sin fecha larga repetida). */
export function buildAppleHealthSyncChipCompact(latest: AutoHealthMetric | null | undefined): AppleSyncChip {
  if (!latest?.observed_at) {
    return {
      label: "Sin lectura",
      fg: SALUD_SEM.warn,
      bg: saludHexToRgba(SALUD_SEM.warn, 0.1),
    }
  }
  if (appleHealthSyncStale(latest.observed_at)) {
    return {
      label: `Desactualizado · ${formatAppleHealthSyncWhenShort(latest.observed_at)}`,
      fg: SALUD_SEM.risk,
      bg: saludHexToRgba(SALUD_SEM.risk, 0.1),
    }
  }
  return {
    label: `Ok · ${formatAppleHealthSyncWhenShort(latest.observed_at)}`,
    fg: SALUD_SEM.ok,
    bg: saludHexToRgba(SALUD_SEM.ok, 0.1),
  }
}

/** Chip + colores alineados con AppleHealthLuxurySection. */
export function buildAppleHealthSyncChip(latest: AutoHealthMetric | null | undefined): AppleSyncChip {
  if (!latest?.observed_at) {
    return {
      label: "Sin lectura de Apple",
      fg: SALUD_SEM.warn,
      bg: saludHexToRgba(SALUD_SEM.warn, 0.14),
    }
  }
  if (appleHealthSyncStale(latest.observed_at)) {
    return {
      label: `Apple · ${formatAppleHealthSyncWhen(latest.observed_at)} · desactualizado`,
      fg: SALUD_SEM.risk,
      bg: saludHexToRgba(SALUD_SEM.risk, 0.14),
    }
  }
  return {
    label: `Apple · ${formatAppleHealthSyncWhen(latest.observed_at)} · al día`,
    fg: SALUD_SEM.ok,
    bg: saludHexToRgba(SALUD_SEM.ok, 0.14),
  }
}
