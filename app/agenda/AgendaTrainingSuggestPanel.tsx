"use client"

import { useMemo } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { CalendarPlus, ClipboardCopy, X } from "lucide-react"
import { getAgendaDisplayTimeZone } from "@/lib/agenda/agendaTimeZone"
import { agendaTodayYmd } from "@/lib/agenda/localDateKey"
import { googleCalendarTemplateUrl, suggestWorkoutSlots, type WorkoutSlotPref } from "@/lib/agenda/suggestWorkoutSlots"
import {
  AGENDA_SUGGEST_TRAINING_KEY,
  AGENDA_SUGGEST_TRAINING_VALUE,
} from "@/lib/training/agendaTrainingLinks"
import type { GoogleCalendarEventDTO } from "@/lib/google/types"

type Props = {
  events: GoogleCalendarEventDTO[]
  calendarConnected: boolean
  calendarLoading: boolean
}

export function AgendaTrainingSuggestPanel({ events, calendarConnected, calendarLoading }: Props) {
  const searchParams = useSearchParams()
  const router = useRouter()
  const active = searchParams.get(AGENDA_SUGGEST_TRAINING_KEY) === AGENDA_SUGGEST_TRAINING_VALUE

  const duration = useMemo(() => {
    const raw = searchParams.get("duracion")
    const n = raw ? Number.parseInt(raw, 10) : 60
    if (!Number.isFinite(n)) return 60
    return Math.min(180, Math.max(15, n))
  }, [searchParams])

  const pref = useMemo((): WorkoutSlotPref => {
    const p = searchParams.get("pref")
    if (p === "morning" || p === "mañana") return "morning"
    if (p === "afternoon" || p === "tarde") return "afternoon"
    return null
  }, [searchParams])

  const tz = getAgendaDisplayTimeZone()
  const startYmd = agendaTodayYmd()

  const slots = useMemo(() => {
    if (!active) return []
    return suggestWorkoutSlots({
      events,
      startYmd,
      horizonDays: 5,
      durationMinutes: duration,
      timeZone: tz,
      pref,
      maxSlots: 4,
    })
  }, [active, events, startYmd, duration, tz, pref])

  if (!active) return null

  const clearQuery = () => {
    router.replace("/agenda")
  }

  return (
    <div
      className="border-b border-[var(--color-border)] px-4 py-3 lg:px-6"
      style={{ background: "color-mix(in srgb, var(--color-accent-health) 8%, var(--agenda-shell-bg))" }}
      role="region"
      aria-label="Sugerencia de horario para entrenar"
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="m-0 text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--color-text-secondary)]">Entreno · huecos sugeridos</p>
          <p className="m-0 mt-0.5 text-sm font-semibold text-[var(--color-text-primary)]">
            {calendarLoading
              ? "Cargando calendario…"
              : calendarConnected
                ? `Bloques de ~${duration} min (próximos días)`
                : "Conecta Google Calendar para ver huecos según tu disponibilidad real."}
          </p>
        </div>
        <div className="flex shrink-0 gap-1">
          <button
            type="button"
            onClick={clearQuery}
            className="inline-flex items-center gap-1 rounded-lg border border-[var(--color-border)] px-2 py-1 text-[11px] font-medium text-[var(--color-text-secondary)]"
            style={{ background: "var(--agenda-elevated-bg)" }}
          >
            <X size={14} aria-hidden />
            Cerrar
          </button>
        </div>
      </div>
      {!calendarConnected && !calendarLoading ? (
        <p className="m-0 mt-2 text-[12px] text-[var(--color-text-secondary)]">
          Cuando Calendar esté conectado, aquí verás 2–4 opciones basadas en eventos existentes.{" "}
          <Link href="/configuracion" className="font-semibold underline-offset-2 hover:underline">
            Configuración
          </Link>
        </p>
      ) : null}
      {slots.length > 0 ? (
        <ul className="m-0 mt-2 list-none space-y-2 p-0">
          {slots.map((s) => {
            const gUrl = googleCalendarTemplateUrl("Entrenamiento Órvita", s.startAt, s.endAt)
            return (
              <li
                key={s.startAt}
                className="flex flex-col gap-1.5 rounded-lg border border-[var(--color-border)] px-2.5 py-2 sm:flex-row sm:items-center sm:justify-between"
                style={{ background: "var(--agenda-elevated-bg)" }}
              >
                <span className="text-[12px] font-medium text-[var(--color-text-primary)]">{s.label}</span>
                <div className="flex flex-wrap gap-1">
                  <button
                    type="button"
                    onClick={() => void navigator.clipboard.writeText(`${s.label} · ${s.startAt}`)}
                    className="inline-flex items-center gap-1 rounded-md border border-[var(--color-border)] px-2 py-1 text-[11px] font-medium text-[var(--color-text-primary)]"
                  >
                    <ClipboardCopy size={12} aria-hidden />
                    Copiar
                  </button>
                  <a
                    href={gUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 rounded-md border border-[var(--color-border)] px-2 py-1 text-[11px] font-semibold text-[var(--color-text-primary)] no-underline"
                    style={{ background: "color-mix(in srgb, var(--color-accent-health) 12%, transparent)" }}
                  >
                    <CalendarPlus size={12} aria-hidden />
                    Google Calendar
                  </a>
                </div>
              </li>
            )
          })}
        </ul>
      ) : calendarConnected && !calendarLoading ? (
        <p className="m-0 mt-2 text-[12px] text-[var(--color-text-secondary)]">
          No encontramos huecos de {duration} min en la ventana habitual. Prueba otra duración en la URL{" "}
          <code className="rounded bg-[var(--color-surface-alt)] px-1">duracion=45</code> o amplía el rango en Calendar.
        </p>
      ) : null}
    </div>
  )
}
