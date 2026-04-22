"use client"

import { useMemo } from "react"
import { buildStrategicDay, type StrategicDayPayload } from "@/lib/insights/buildStrategicDay"
import { useFinanceMonthSummary } from "@/app/hooks/useFinanceMonthSummary"
import { useOperationalContext } from "@/app/hooks/useOperationalContext"

/**
 * Día estratégico: `operationalContext` + capital + (opcional) minutos de reunión.
 * Para Inicio, `meetingMinutes` puede ser 0; en Hoy pasa el total del calendario.
 */
export function useStrategicDay(meetingMinutes: number): {
  strategic: StrategicDayPayload
  loading: boolean
  error: string | null
} {
  const { data: ctx, loading, error } = useOperationalContext()
  const { data: finance } = useFinanceMonthSummary()

  const strategic = useMemo(
    () => buildStrategicDay({ ctx, finance: finance ?? null, meetingMinutes }),
    [ctx, finance, meetingMinutes],
  )

  return { strategic, loading, error }
}
