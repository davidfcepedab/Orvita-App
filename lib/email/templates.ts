/** Textos planos para Resend (sin motor de plantillas por ahora). */

export function morningDigestEmail(args: { dateLabel: string }) {
  return `Órvita — Pulso del día (${args.dateLabel})

Este es un resumen por correo opcional. El detalle está en la app:
https://orvita.app/inicio

Puedes desactivar estos correos en Configuración cuando exista el interruptor en la UI (preferencias ya en base de datos).
`
}

export function weeklyDigestEmail(args: { dateLabel: string }) {
  return `Órvita — Cierre de semana (${args.dateLabel})

Resumen semanal opcional. Abre la app para ver Capital, Salud y Agenda:
https://orvita.app/inicio
`
}

export type EmailCategory =
  | "digest_morning"
  | "digest_weekly"
  | "transactional"
  | "security"
