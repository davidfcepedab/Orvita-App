import { formatCompactAgoEs } from "@/lib/time/formatRelativeSyncAgo"
import { SALUD_SEM } from "@/lib/salud/saludSemanticPalette"
import { saludHexToRgba } from "@/lib/salud/saludThemeStyles"

/** Misma idea que Apple Health: >48h sin sync = desactualizado. */
const STALE_MS = 48 * 60 * 60 * 1000

export function bankingBelvoSyncStale(iso: string | null | undefined): boolean {
  if (!iso) return true
  const age = Date.now() - new Date(iso).getTime()
  if (!Number.isFinite(age)) return true
  return age > STALE_MS
}

export type BankingBelvoSyncChip = { label: string; fg: string; bg: string }

export function buildBelvoBankingSyncChip(lastSync: string | null | undefined): BankingBelvoSyncChip {
  if (!lastSync) {
    return {
      label: "Pendiente · sin sync registrada",
      fg: SALUD_SEM.warn,
      bg: saludHexToRgba(SALUD_SEM.warn, 0.12),
    }
  }
  const ago = formatCompactAgoEs(lastSync)
  if (bankingBelvoSyncStale(lastSync)) {
    return {
      label: `Desactualizado · ${ago}`,
      fg: SALUD_SEM.risk,
      bg: saludHexToRgba(SALUD_SEM.risk, 0.12),
    }
  }
  return {
    label: `Ok · ${ago}`,
    fg: SALUD_SEM.ok,
    bg: saludHexToRgba(SALUD_SEM.ok, 0.12),
  }
}
