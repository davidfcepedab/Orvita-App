"use client"

import { useEffect, useState } from "react"
import { useFinance } from "../FinanceContext"
import { Card } from "@/src/components/ui/Card"
import { messageForHttpError } from "@/lib/api/friendlyHttpError"
import { financeApiGet } from "@/lib/finanzas/financeClientFetch"

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
    <div className="min-w-0 space-y-4">
      <Card className="min-w-0 p-4 sm:p-6">
        <p className="text-xs uppercase tracking-[0.14em] text-orbita-secondary">Auditoría</p>
        <h2 className="mt-2 text-lg font-semibold text-orbita-primary">Cambios en movimientos</h2>
        <p className="mt-2 text-sm text-orbita-secondary">
          Registros de actualización y borrado en <code className="text-xs">orbita_finance_transactions</code>{" "}
          del periodo activo (UTC), filtrados por tu hogar vía RLS.
        </p>
      </Card>

      {loading && <p className="text-sm text-orbita-secondary">Cargando…</p>}
      {error && (
        <Card className="border border-red-200 p-4 text-sm text-red-600">
          {error}
        </Card>
      )}

      {!loading && !error && rows.length === 0 && (
        <p className="text-sm text-orbita-secondary">Sin eventos de auditoría todavía.</p>
      )}

      {!loading && rows.length > 0 && (
        <Card className="min-w-0 overflow-x-auto p-0">
          <table className="w-full min-w-[36rem] text-left text-sm">
            <thead>
              <tr className="border-b border-orbita-border text-xs uppercase tracking-wide text-orbita-secondary">
                <th className="px-4 py-3">Cuándo</th>
                <th className="px-4 py-3">Acción</th>
                <th className="px-4 py-3">Transacción</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-b border-orbita-border/60">
                  <td className="px-4 py-2.5 tabular-nums text-orbita-secondary">
                    {new Date(r.changed_at).toLocaleString("es-CO")}
                  </td>
                  <td className="px-4 py-2.5 text-orbita-primary">{r.action}</td>
                  <td className="max-w-[12rem] truncate px-4 py-2.5 font-mono text-xs text-orbita-secondary">
                    {r.transaction_id ?? "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  )
}
