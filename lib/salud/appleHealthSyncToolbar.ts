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

/** Chip + colores alineados con AppleHealthLuxurySection. */
export function buildAppleHealthSyncChip(latest: AutoHealthMetric | null | undefined): AppleSyncChip {
  if (!latest?.observed_at) {
    return {
      label: "Sync · sin lectura",
      fg: SALUD_SEM.warn,
      bg: saludHexToRgba(SALUD_SEM.warn, 0.14),
    }
  }
  if (appleHealthSyncStale(latest.observed_at)) {
    return {
      label: `Sync · ${formatAppleHealthSyncWhen(latest.observed_at)} · desactualizado`,
      fg: SALUD_SEM.risk,
      bg: saludHexToRgba(SALUD_SEM.risk, 0.14),
    }
  }
  return {
    label: `Sync · ${formatAppleHealthSyncWhen(latest.observed_at)} · ok`,
    fg: SALUD_SEM.ok,
    bg: saludHexToRgba(SALUD_SEM.ok, 0.14),
  }
}
