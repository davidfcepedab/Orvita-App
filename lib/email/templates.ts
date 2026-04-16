import { formatDateLabelForUser } from "@/lib/email/dateLabelFormat"

/** `dateLabel` en el cron es YYYY-MM-DD. Texto plano alineado al HTML (informe / resumen). */
export function morningDigestEmail(args: { dateLabel: string; greetingFirstName?: string | null }) {
  const when = formatDateLabelForUser(args.dateLabel)
  const hi = args.greetingFirstName?.trim()
  const saludo = hi ? `Hola, ${hi},\n\n` : ""
  return `${saludo}Órvita — Tu pulso del día (${when})
INFORME BREVE (síntesis; el detalle completo está en la app)

Este correo resume tu pulso operativo por frentes. Las cifras exactas, tablas y gráficos siguen en Órvita.

AGENDA
Ventana del día y bloques prioritarios — horarios y sync en la app.

HÁBITOS
Disciplina del día y pendientes — historial en la app.

CAPITAL
Flujo y decisiones — movimientos completos en Finanzas.

SALUD
Bienestar y rutinas — seguimiento ampliado en Salud.

→ https://orvita.app/inicio

Puedes desactivar este informe en Configuración → Notificaciones.
`
}

export function weeklyDigestEmail(args: { dateLabel: string; greetingFirstName?: string | null }) {
  const when = formatDateLabelForUser(args.dateLabel)
  const hi = args.greetingFirstName?.trim()
  const saludo = hi ? `Hola, ${hi},\n\n` : ""
  return `${saludo}Órvita — Cierre de semana (semana que incluye ${when})
INFORME DE CIERRE (síntesis; el tablero completo está en la app)

LA SEMANA EN CONJUNTO
Cómo se movieron agenda, capital, hábitos y salud — detalle por módulo en Órvita.

CAPITAL Y DECISIONES
Flujo y decisiones pendientes — contexto en Finanzas y Decisión.

DISCIPLINA Y HÁBITOS
Consistencia y brechas — racha e historial en Hábitos.

PRÓXIMA SEMANA
Ajusta prioridades y compromisos para la semana siguiente.

→ https://orvita.app/inicio

Puedes desactivar este informe en Configuración → Notificaciones.
`
}

export type EmailCategory =
  | "digest_morning"
  | "digest_weekly"
  | "transactional"
  | "security"
