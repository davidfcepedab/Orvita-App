import { formatDateLabelForUser } from "@/lib/email/dateLabelFormat"
import { escapeHtml } from "@/lib/email/htmlEscape"

function appBaseUrl(): string {
  const raw = process.env.NEXT_PUBLIC_APP_URL?.trim() || "https://orvita.app"
  return raw.replace(/\/$/, "")
}

export type EmailReportSection = { title: string; lines: string[] }

function reportSectionsHtml(sections: EmailReportSection[]): string {
  return sections
    .map(
      (sec) => `
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 14px 0;background-color:#f8fafc;border-radius:12px;border:1px solid #e2e8f0;">
  <tr>
    <td style="padding:16px 18px;">
      <p style="margin:0 0 10px 0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;font-size:12px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:#0f766e;">${escapeHtml(sec.title)}</p>
      ${sec.lines
        .map(
          (line) =>
            `<p style="margin:0 0 8px 0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;font-size:14px;line-height:1.55;color:#334155;">${escapeHtml(line)}</p>`,
        )
        .join("")}
    </td>
  </tr>
</table>`,
    )
    .join("")
}

/**
 * Plantilla HTML: informe / resumen ejecutivo (tablas + estilos en línea).
 * Las secciones pueden rellenarse con datos reales desde el cron en una fase siguiente.
 */
function layoutReportEmail(args: {
  preheader: string
  eyebrow: string
  title: string
  dateLine: string
  greetingFirstName?: string | null
  leadParagraphs: string[]
  reportSections: EmailReportSection[]
  ctaLabel: string
  ctaPath: string
  footerNote: string
}): string {
  const base = appBaseUrl()
  const ctaUrl = `${base}${args.ctaPath.startsWith("/") ? args.ctaPath : `/${args.ctaPath}`}`

  const greet =
    args.greetingFirstName?.trim() ?
      `<p style="margin:0 0 18px 0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;font-size:17px;font-weight:600;line-height:1.35;color:#0f172a;">${escapeHtml(`Hola, ${args.greetingFirstName.trim()},`)}</p>`
    : ""

  const lead = args.leadParagraphs
    .map(
      (t) =>
        `<p style="margin:0 0 14px 0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;font-size:15px;line-height:1.55;color:#334155;">${escapeHtml(t)}</p>`,
    )
    .join("")

  const sections = reportSectionsHtml(args.reportSections)

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta name="color-scheme" content="light" />
  <title>${escapeHtml(args.title)}</title>
</head>
<body style="margin:0;padding:0;background-color:#f1f5f9;-webkit-font-smoothing:antialiased;">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">${escapeHtml(args.preheader)}</div>
  <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background-color:#f1f5f9;padding:24px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="max-width:560px;background-color:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #e2e8f0;box-shadow:0 1px 2px rgba(15,23,42,0.06);">
          <tr>
            <td style="height:4px;background:linear-gradient(90deg,#10b981,#14b8a6);"></td>
          </tr>
          <tr>
            <td style="padding:28px 28px 8px 28px;">
              <p style="margin:0 0 4px 0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;font-size:11px;font-weight:600;letter-spacing:0.12em;text-transform:uppercase;color:#64748b;">${escapeHtml(args.eyebrow)}</p>
              <h1 style="margin:0 0 8px 0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;font-size:22px;font-weight:600;line-height:1.25;color:#0f172a;">${escapeHtml(args.title)}</h1>
              <p style="margin:0 0 18px 0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;font-size:13px;color:#64748b;">${escapeHtml(args.dateLine)}</p>
              ${greet}
              ${lead}
              ${sections}
              <table role="presentation" cellpadding="0" cellspacing="0" style="margin:12px 0 24px 0;">
                <tr>
                  <td style="border-radius:10px;background-color:#10b981;">
                    <a href="${escapeHtml(ctaUrl)}" style="display:inline-block;padding:12px 22px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;font-size:15px;font-weight:600;color:#ffffff;text-decoration:none;">${escapeHtml(args.ctaLabel)}</a>
                  </td>
                </tr>
              </table>
              <p style="margin:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;font-size:12px;line-height:1.5;color:#94a3b8;border-top:1px solid #f1f5f9;padding-top:16px;">${escapeHtml(args.footerNote)}</p>
            </td>
          </tr>
        </table>
        <p style="margin:16px 0 0 0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;font-size:11px;color:#94a3b8;text-align:center;">Órvita — Sistema operativo estratégico</p>
      </td>
    </tr>
  </table>
</body>
</html>`
}

export function morningDigestHtml(args: { dateYmd: string; greetingFirstName?: string | null }): string {
  const nice = formatDateLabelForUser(args.dateYmd)
  return layoutReportEmail({
    preheader: `Informe de pulso · ${nice}`,
    eyebrow: "Resumen ejecutivo",
    title: "Tu pulso del día",
    dateLine: `Informe con fecha ${nice}`,
    greetingFirstName: args.greetingFirstName,
    leadParagraphs: [
      "Este correo es un informe breve de tu pulso operativo: está pensado para leerlo en uno o dos minutos. Aquí va la síntesis por frentes; los datos vivos, tablas largas y gráficos siguen en la app.",
      "En una siguiente fase podremos inyectar aquí cifras y listas automáticas desde tu cuenta (agenda, hábitos, flujo, salud).",
    ],
    reportSections: [
      {
        title: "Agenda",
        lines: [
          "Ventana del día y bloques que marcan el ritmo: prioridades, reuniones y foco. Abre Agenda en Órvita para horarios exactos y sincronización con tu calendario.",
        ],
      },
      {
        title: "Hábitos",
        lines: [
          "Disciplina del día: qué hábitos están activos y qué falta por registrar. El detalle y el historial están en la sección Hábitos.",
        ],
      },
      {
        title: "Capital",
        lines: [
          "Flujo, decisiones y operación financiera: este bloque resume el frente económico; balances y movimientos completos viven en Finanzas.",
        ],
      },
      {
        title: "Salud",
        lines: [
          "Señales de salud y rutinas: un vistazo al frente físico y de bienestar. Métricas y seguimiento amplios están en Salud.",
        ],
      },
    ],
    ctaLabel: "Abrir informe en Órvita",
    ctaPath: "/inicio",
    footerNote:
      "Si activaste el correo en Configuración → Notificaciones, recibes este informe según tus horas. Puedes desactivarlo cuando quieras.",
  })
}

export function weeklyDigestHtml(args: { dateYmd: string; greetingFirstName?: string | null }): string {
  const nice = formatDateLabelForUser(args.dateYmd)
  return layoutReportEmail({
    preheader: `Informe de cierre de semana · ${nice}`,
    eyebrow: "Resumen ejecutivo",
    title: "Cierre de semana",
    dateLine: `Semana que incluye el ${nice}`,
    greetingFirstName: args.greetingFirstName,
    leadParagraphs: [
      "Este es un informe de cierre: una lectura orientada a decidir la semana siguiente. No sustituye el tablero completo en Órvita; lo complementa.",
      "Más adelante podremos añadir aquí totales automáticos (hábitos cumplidos, flujo de la semana, foco de decisiones) según tus datos.",
    ],
    reportSections: [
      {
        title: "La semana en conjunto",
        lines: [
          "Síntesis de cómo se movieron tus frentes (agenda, capital, hábitos, salud). Para el detalle semana a semana, usa Inicio y cada módulo.",
        ],
      },
      {
        title: "Capital y decisiones",
        lines: [
          "Qué quedó pendiente en flujo y decisiones operativas. Revisa Finanzas y Decisión para cifras y contexto.",
        ],
      },
      {
        title: "Disciplina y hábitos",
        lines: [
          "Consistencia y brechas en hábitos. La racha y el historial completos están en Hábitos.",
        ],
      },
      {
        title: "Próxima semana",
        lines: [
          "Lleva este cierre a la siguiente semana: ajusta prioridades en Agenda y deja fijados tus compromisos en Órvita.",
        ],
      },
    ],
    ctaLabel: "Ver informe en Órvita",
    ctaPath: "/inicio",
    footerNote:
      "Correo opcional de cierre semanal. Los datos completos y el contexto vivo están siempre en tu espacio Órvita.",
  })
}
