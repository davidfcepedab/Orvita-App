"use client"

import { useEffect, useState } from "react"
import type { UiAgendaTask } from "@/app/agenda/mapAgendaTaskToUi"
import { priorityFormToApi } from "@/app/agenda/mapAgendaTaskToUi"
import type { GoogleTaskDTO, GoogleTaskLocalPriority } from "@/lib/google/types"
import type { GoogleCalendarEventDTO } from "@/lib/google/types"
import type { HouseholdMemberDTO } from "@/lib/household/memberTypes"
import type { AgendaTaskPriority } from "@/app/hooks/useAgendaTasks"
import { GOOGLE_CALENDAR_WEB_APP, GOOGLE_TASKS_WEB_APP } from "@/lib/agenda/googleEditUrls"

export type AgendaEditModalTarget =
  | { kind: "orvita"; task: UiAgendaTask }
  | { kind: "google-reminder"; task: GoogleTaskDTO }
  | { kind: "google-calendar"; event: GoogleCalendarEventDTO }

type Props = {
  target: AgendaEditModalTarget | null
  onClose: () => void
  householdMembers: HouseholdMemberDTO[]
  onSaveOrvita: (
    id: string,
    patch: Partial<{
      dueDate: string | null
      assigneeId: string | null
      assigneeName: string | null
      priority: AgendaTaskPriority
    }>,
  ) => Promise<void>
  onSaveGoogleReminder: (
    id: string,
    patch: {
      due?: string | null
      localAssigneeUserId?: string | null
      localPriority?: GoogleTaskLocalPriority | null
    },
  ) => Promise<void>
}

export function AgendaTaskEditModal({
  target,
  onClose,
  householdMembers,
  onSaveOrvita,
  onSaveGoogleReminder,
}: Props) {
  const open = target != null
  const [due, setDue] = useState("")
  const [priorityOrvita, setPriorityOrvita] = useState<UiAgendaTask["priority"]>("media")
  const [assigneeId, setAssigneeId] = useState("")
  const [localAssignee, setLocalAssignee] = useState("")
  const [localPri, setLocalPri] = useState<GoogleTaskLocalPriority | "">("")
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  useEffect(() => {
    if (!target) return
    setErr(null)
    if (target.kind === "orvita") {
      setDue(target.task.due || "")
      setPriorityOrvita(target.task.priority)
      setAssigneeId(target.task.assigneeUserId ?? "")
    } else if (target.kind === "google-reminder") {
      const ymd =
        target.task.due && target.task.due.length >= 10 ? target.task.due.slice(0, 10) : ""
      setDue(ymd)
      setLocalAssignee(target.task.localAssigneeUserId ?? "")
      setLocalPri(target.task.localPriority ?? "")
    }
  }, [target])

  async function submit() {
    if (!target) return
    setBusy(true)
    setErr(null)
    try {
      if (target.kind === "orvita") {
        const m = assigneeId ? householdMembers.find((h) => h.id === assigneeId) : null
        await onSaveOrvita(target.task.id, {
          dueDate: due || null,
          priority: priorityFormToApi(priorityOrvita),
          assigneeId: assigneeId || null,
          assigneeName: m ? (m.displayName?.trim() || m.email || null) : null,
        })
      } else if (target.kind === "google-reminder") {
        await onSaveGoogleReminder(target.task.id, {
          due: due ? `${due}T12:00:00.000Z` : null,
          localAssigneeUserId: localAssignee || null,
          localPriority:
            localPri === "Alta" || localPri === "Media" || localPri === "Baja" ? localPri : null,
        })
      }
      onClose()
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Error al guardar")
    } finally {
      setBusy(false)
    }
  }

  if (!open || !target) return null

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/35 px-4 py-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="agenda-edit-modal-title"
      onClick={onClose}
    >
      <div
        className="max-h-[90dvh] w-full max-w-md overflow-y-auto rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-2">
          <h2
            id="agenda-edit-modal-title"
            className="m-0 text-[15px] font-semibold text-[var(--color-text-primary)]"
          >
            {target.kind === "orvita" && "Editar tarea"}
            {target.kind === "google-reminder" && "Editar recordatorio"}
            {target.kind === "google-calendar" && "Evento de calendario"}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="text-[12px] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
          >
            Cerrar
          </button>
        </div>
        {target.kind === "google-calendar" ? (
          <div className="mt-4 grid gap-3 text-[13px] text-[var(--color-text-secondary)]">
            <p className="m-0 font-medium text-[var(--color-text-primary)]">{target.event.summary}</p>
            <p className="m-0">Los eventos se gestionan en Google Calendar.</p>
            <a
              href={GOOGLE_CALENDAR_WEB_APP}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex justify-center rounded-lg bg-[var(--agenda-calendar)] px-3 py-2 text-[12px] font-semibold text-white"
            >
              Abrir en Google Calendar
            </a>
          </div>
        ) : (
          <>
            <div className="mt-4 grid gap-3">
              <label className="grid gap-1 text-[11px] text-[var(--color-text-secondary)]">
                Vence
                <input
                  type="date"
                  value={due}
                  onChange={(e) => setDue(e.target.value)}
                  className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-alt)] px-2 py-2 text-[13px] text-[var(--color-text-primary)]"
                />
              </label>
              {target.kind === "orvita" ? (
                <>
                  <label className="grid gap-1 text-[11px] text-[var(--color-text-secondary)]">
                    Prioridad
                    <select
                      value={priorityOrvita}
                      onChange={(e) =>
                        setPriorityOrvita(e.target.value as UiAgendaTask["priority"])
                      }
                      className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-alt)] px-2 py-2 text-[13px] text-[var(--color-text-primary)]"
                    >
                      <option value="alta">Alta</option>
                      <option value="media">Media</option>
                      <option value="baja">Baja</option>
                    </select>
                  </label>
                  {(target.task.type === "personal" || target.task.type === "asignada") &&
                  householdMembers.length > 0 ? (
                    <label className="grid gap-1 text-[11px] text-[var(--color-text-secondary)]">
                      Responsable
                      <select
                        value={assigneeId}
                        onChange={(e) => setAssigneeId(e.target.value)}
                        className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-alt)] px-2 py-2 text-[13px] text-[var(--color-text-primary)]"
                      >
                        {target.task.type === "personal" ? <option value="">Para mí</option> : null}
                        {householdMembers.map((m) => (
                          <option key={m.id} value={m.id}>
                            {m.displayName || m.email}
                          </option>
                        ))}
                      </select>
                    </label>
                  ) : null}
                </>
              ) : (
                <>
                  <label className="grid gap-1 text-[11px] text-[var(--color-text-secondary)]">
                    Responsable (hogar, local)
                    <select
                      value={localAssignee}
                      onChange={(e) => setLocalAssignee(e.target.value)}
                      className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-alt)] px-2 py-2 text-[13px] text-[var(--color-text-primary)]"
                    >
                      <option value="">—</option>
                      {householdMembers.map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.displayName || m.email}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="grid gap-1 text-[11px] text-[var(--color-text-secondary)]">
                    Prioridad (local)
                    <select
                      value={localPri}
                      onChange={(e) => setLocalPri(e.target.value as GoogleTaskLocalPriority | "")}
                      className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-alt)] px-2 py-2 text-[13px] text-[var(--color-text-primary)]"
                    >
                      <option value="">—</option>
                      <option value="Alta">Alta</option>
                      <option value="Media">Media</option>
                      <option value="Baja">Baja</option>
                    </select>
                  </label>
                </>
              )}
            </div>
            {err ? (
              <p className="mt-2 text-[12px] text-[var(--color-accent-danger)]">{err}</p>
            ) : null}
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg border border-[var(--color-border)] px-3 py-2 text-[12px] text-[var(--color-text-primary)]"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => void submit()}
                className="rounded-lg bg-[var(--color-accent-primary)] px-3 py-2 text-[12px] font-semibold text-white disabled:opacity-50"
              >
                {busy ? "Guardando…" : "Guardar"}
              </button>
            </div>
            {target.kind === "google-reminder" ? (
              <p className="mt-3 text-[10px] text-[var(--color-text-secondary)]">
                También puedes editar en{" "}
                <a
                  href={GOOGLE_TASKS_WEB_APP}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline"
                >
                  Google Tasks
                </a>
                .
              </p>
            ) : null}
          </>
        )}
      </div>
    </div>
  )
}
