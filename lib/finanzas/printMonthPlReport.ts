import { formatInstantInAgendaTz } from "@/lib/agenda/localDateKey"
import type { CanonicalPlLayer } from "@/lib/finanzas/canonicalMonthPl"

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
}

/**
 * Abre ventana de impresión con capas P&amp;L (el usuario puede «Guardar como PDF» desde el diálogo).
 */
export function printMonthPlReport(monthLabel: string, layers: CanonicalPlLayer[], title = "P&L del mes — Órbita Capital"): void {
  const fmt = (n: number) =>
    new Intl.NumberFormat("es-CO", { maximumFractionDigits: 0 }).format(Math.round(n || 0))

  const bodyRows = layers
    .map((L) => {
      const pad = L.indent * 14
      const hint = L.hint
        ? `<div style="font-size:10px;color:#64748b;margin-top:3px;padding-left:${pad + 8}px;max-width:48rem">${escapeHtml(L.hint)}</div>`
        : ""
      return `<tr>
        <td style="padding:6px 0 2px;padding-left:${pad}px;font-size:13px;vertical-align:top">${escapeHtml(L.label)}</td>
        <td style="padding:6px 0 2px;text-align:right;font-size:13px;font-variant-numeric:tabular-nums;white-space:nowrap">${fmt(L.amount)}</td>
      </tr>${hint}`
    })
    .join("")

  const html = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8"/>
  <title>${escapeHtml(title)} — ${escapeHtml(monthLabel)}</title>
  <style>
    body { font-family: system-ui, -apple-system, Segoe UI, sans-serif; margin: 24px; color: #0f172a; }
    h1 { font-size: 18px; margin: 0 0 4px; }
    .sub { font-size: 12px; color: #64748b; margin-bottom: 20px; }
    table { width: 100%; border-collapse: collapse; max-width: 40rem; }
    @media print { body { margin: 12mm; } }
  </style>
</head>
<body>
  <h1>${escapeHtml(title)}</h1>
  <p class="sub">Periodo: ${escapeHtml(monthLabel)} · Generado ${escapeHtml(formatInstantInAgendaTz(new Date().toISOString()))}</p>
  <table>
    <tbody>${bodyRows}</tbody>
  </table>
</body>
</html>`

  const w = window.open("", "_blank", "noopener,noreferrer")
  if (!w) return
  w.document.write(html)
  w.document.close()
  w.focus()
  w.print()
  w.addEventListener("afterprint", () => w.close())
}
