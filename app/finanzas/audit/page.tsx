"use client"

import { useEffect, useState } from "react"
import { useFinance } from "../FinanceContext"
import { FinanceViewHeader } from "../_components/FinanceViewHeader"
import {
  financeCardMicroLabelClass,
  financeModuleContentStackClass,
  financeModulePageBodyClass,
  financePlStackClass,
  financeSectionEyebrowClass,
  financeSectionIntroClass,
} from "../_components/financeChrome"
import { Card } from "@/src/components/ui/Card"
import { messageForHttpError } from "@/lib/api/friendlyHttpError"
import { formatInstantInAgendaTz, formatYmLongMonthYearEsCo } from "@/lib/agenda/localDateKey"
import { financeApiGet } from "@/lib/finanzas/financeClientFetch"
import { cn } from "@/lib/utils"

type AuditRow = {
  id: string
  transaction_id: string | null
  household_id: string
  action: string
  changed_at: string
  old_data?: unknown
  new_data?: unknown
}

export default function FinanzasAuditPage() {
  const finance = useFinance()
  const month = finance?.month ?? ""
  const capitalEpoch = finance?.capitalDataEpoch ?? 0
  const [rows, setRows] = useState<AuditRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!month) {
      setRows([])
      setLoading(false)
      setError(null)
      return
    }

    let cancelled = false
    ;(async () => {
      try {
        setLoading(true)
        setError(null)
        const res = await financeApiGet(
          `/api/orbita/finanzas/audit?limit=100&month=${encodeURIComponent(month)}`,
        )
        const json = (await res.json()) as {
          success?: boolean
          data?: AuditRow[]
          error?: string
        }
        if (cancelled) return
        if (!res.ok || !json.success) {
          throw new Error(messageForHttpError(res.status, json.error, res.statusText))
        }
        setRows(Array.isArray(json.data) ? json.data : [])
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Error")
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [month, capitalEpoch])

  if (!finance) {
    return <div className="p-6 text-center text-orbita-secondary">Inicializando...</div>
  }

  return (
    <div className={cn(financePlStackClass, financeModulePageBodyClass, financeModuleContentStackClass)}>
      <FinanceViewHeader
        kicker="Trazabilidad"
        title="Historial de cambios"
        subtitle={
          month
            ? `Cambios registrados en movimientos de ${formatYmLongMonthYearEsCo(month)}. Visible solo para tu hogar (Supabase + RLS).`
            : "Elige un mes en la barra superior para filtrar el historial."
        }
      />

      <section className="space-y-2" aria-label="Sobre el historial">
        <h2 className={financeSectionEyebrowClass}>Trazabilidad en tu hogar</h2>
        <p className={financeSectionIntroClass}>
          Listado técnico de altas, ediciones y borrados registrados en base de datos. Úsalo para auditar quién cambió
          qué; el detalle de montos sigue viviendo en Movimientos.
        </p>
      </section>

      {loading && <p className="text-[11px] text-orbita-muted sm:text-sm">Cargando eventos…</p>}
      {error && (
        <Card className="border border-red-200 p-4 text-sm text-red-600">
          {error}
        </Card>
      )}

      {!loading && !error && rows.length === 0 && (
        <Card className="border border-dashed border-orbita-border/80 bg-orbita-surface-alt/40 p-4 sm:p-5">
          <p className="m-0 text-sm font-medium text-orbita-primary">Aún no hay eventos en este periodo</p>
          <p className="mt-2 text-sm leading-relaxed text-orbita-secondary">
            Aquí aparecen altas, ediciones y borrados sobre movimientos financieros cuando la app registra el cambio en
            base de datos. Si acabas de empezar o no has editado movimientos en{" "}
            <span className="font-medium text-orbita-primary">{month ? formatYmLongMonthYearEsCo(month) : "este mes"}</span>, la
            lista puede estar vacía.
          </p>
        </Card>
      )}

      {!loading && rows.length > 0 && (
        <Card className="min-w-0 overflow-hidden border-orbita-border/75 bg-[color-mix(in_srgb,var(--color-surface-alt)_28%,var(--color-surface))] p-0 shadow-[var(--shadow-card)]">
          <div className="border-b border-orbita-border/50 px-4 py-3 sm:px-5">
            <p className={financeCardMicroLabelClass}>Eventos del periodo</p>
            <p className="mt-1 text-[11px] leading-snug text-orbita-muted">Orden cronológico inverso en la tabla (más reciente arriba).</p>
          </div>
          <div className="touch-pan-x overflow-x-auto overscroll-x-contain [-webkit-overflow-scrolling:touch]">
            <table className="w-full min-w-[36rem] border-collapse text-left text-[11px] leading-snug sm:text-sm">
              <thead>
                <tr className="border-b border-orbita-border/60 bg-orbita-surface-alt/45">
                  <th className={cn(financeCardMicroLabelClass, "px-4 py-2.5 text-left font-semibold sm:px-5")}>
                    Cuándo
                  </th>
                  <th className={cn(financeCardMicroLabelClass, "px-4 py-2.5 text-left font-semibold sm:px-5")}>
                    Acción
                  </th>
                  <th className={cn(financeCardMicroLabelClass, "px-4 py-2.5 text-left font-semibold sm:px-5")}>
                    Transacción
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id} className="border-b border-orbita-border/40 odd:bg-orbita-surface-alt/15">
                    <td className="px-4 py-2.5 tabular-nums text-orbita-muted sm:px-5">
                      {formatInstantInAgendaTz(r.changed_at)}
                    </td>
                    <td className="px-4 py-2.5 font-medium text-orbita-primary sm:px-5">{r.action}</td>
                    <td className="max-w-[12rem] truncate px-4 py-2.5 font-mono text-[10px] text-orbita-secondary sm:px-5 sm:text-xs">
                      {r.transaction_id ?? "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  )
}
