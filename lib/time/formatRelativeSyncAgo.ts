/**
 * Tiempo relativo compacto para subtítulos en línea (tras punto medio): «hace 22 h», «hace 5 min».
 * No incluye prefijo largo tipo «Última sincronización».
 */
export function formatCompactAgoEs(iso: string | null | undefined): string {
  if (!iso) return "sin fecha"
  const t = new Date(iso).getTime()
  if (Number.isNaN(t)) return "sin fecha"
  const diff = Date.now() - t
  if (diff < 0) return "ahora mismo"
  const min = Math.floor(diff / 60_000)
  if (min < 1) return "hace un momento"
  if (min < 60) return `hace ${min} min`
  const hrs = Math.floor(min / 60)
  if (hrs < 48) return `hace ${hrs} h`
  const days = Math.floor(hrs / 24)
  return `hace ${days} d`
}

/** Texto fijo para pie de integraciones en Configuración (es-ES). */
export function formatRelativeSyncAgo(iso: string | null | undefined): string {
  if (!iso) return "Última sincronización: nunca sincronizado"
  const t = new Date(iso).getTime()
  if (Number.isNaN(t)) return "Última sincronización: nunca sincronizado"
  const diff = Date.now() - t
  if (diff < 0) return "Última sincronización: hace un momento"
  const sec = Math.floor(diff / 1000)
  if (sec < 60) return "Última sincronización: hace un momento"
  const min = Math.floor(sec / 60)
  if (min < 60) {
    return `Última sincronización: hace ${min} minuto${min === 1 ? "" : "s"}`
  }
  const hrs = Math.floor(min / 60)
  if (hrs < 48) {
    return `Última sincronización: hace ${hrs} hora${hrs === 1 ? "" : "s"}`
  }
  const days = Math.floor(hrs / 24)
  return `Última sincronización: hace ${days} día${days === 1 ? "" : "s"}`
}
