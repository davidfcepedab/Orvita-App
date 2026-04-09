"use client"

import { useEffect, useState } from "react"
import { Check } from "lucide-react"
import type { HouseholdMemberDTO } from "@/lib/household/memberTypes"
import type { GoogleTaskDTO } from "@/lib/google/types"
import type { GoogleTaskLocalPriority } from "@/lib/google/types"
import { localDateKeyFromIso } from "@/lib/agenda/localDateKey"
import { isGoogleTaskDone } from "@/lib/agenda/googleTasksUpcoming"

const inputClass =
  "max-w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-2 py-1 text-[10px] text-[var(--color-text-primary)]"

type Patch = {
  due?: string | null
  title?: string
  status?: string
  localAssigneeUserId?: string | null
  localPriority?: GoogleTaskLocalPriority | null
}

type Props = {
  task: GoogleTaskDTO
  householdMembers: HouseholdMemberDTO[]
  patchTask: (id: string, patch: Patch) => Promise<unknown>
  disabled?: boolean
}

export function GoogleReminderQuickBar({ task, householdMembers, patchTask, disabled }: Props) {
  const [dueDraft, setDueDraft] = useState("")
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  const currentYmd = localDateKeyFromIso(task.due) ?? ""
  const done = isGoogleTaskDone(task.status)

  useEffect(() => {
    setDueDraft(currentYmd)
    setErr(null)
  }, [task.id, currentYmd])

  const run = async (fn: () => Promise<unknown>) => {
    if (disabled || busy) return
    setBusy(true)
    setErr(null)
    try {
      await fn()
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Error al guardar")
    } finally {
      setBusy(false)
    }
  }

  const dueDirty = dueDraft !== currentYmd

  return (
    <div className="flex min-w-0 flex-col gap-2 border-t border-[var(--color-border)] pt-2 mt-1">
      <div className="flex flex-wrap items-center gap-2">
        <label className="flex min-w-0 flex-wrap items-center gap-1 text-[10px] text-[var(--color-text-secondary)]">
          <span className="shrink-0">Vence</span>
          <input
            type="date"
            className={inputClass}
            value={dueDraft}
            onChange={(e) => setDueDraft(e.target.value)}
            disabled={disabled || busy}
            aria-label="Fecha de vencimiento"
          />
          {dueDirty ? (
            <button
              type="button"
              disabled={!dueDraft || busy || disabled}
              onClick={() => void run(() => patchTask(task.id, { due: dueDraft || null }))}
              className="rounded-md border border-[var(--color-border)] bg-[var(--color-surface-alt)] px-2 py-0.5 text-[10px] font-semibold text-[var(--color-text-primary)] disabled:opacity-45"
            >
              {busy ? "…" : "Guardar fecha"}
            </button>
          ) : null}
        </label>
        <label className="flex min-w-0 flex-wrap items-center gap-1 text-[10px] text-[var(--color-text-secondary)]">
          <span className="shrink-0">Responsable (hogar)</span>
          <select
            className={inputClass}
            value={task.localAssigneeUserId ?? ""}
            onChange={(e) => {
              const v = e.target.value
              void run(() =>
                patchTask(task.id, { localAssigneeUserId: v.trim() ? v : null }),
              )
            }}
            disabled={disabled || busy}
            aria-label="Responsable local"
          >
            <option value="">—</option>
            {householdMembers.map((m) => (
              <option key={m.id} value={m.id}>
                {m.displayName?.trim() || m.email || m.id.slice(0, 8)}
              </option>
            ))}
          </select>
        </label>
        <label className="flex min-w-0 flex-wrap items-center gap-1 text-[10px] text-[var(--color-text-secondary)]">
          <span className="shrink-0">Prioridad</span>
          <select
            className={inputClass}
            value={task.localPriority ?? ""}
            onChange={(e) => {
              const v = e.target.value as GoogleTaskLocalPriority | ""
              void run(() =>
                patchTask(task.id, {
                  localPriority: v === "Alta" || v === "Media" || v === "Baja" ? v : null,
                }),
              )
            }}
            disabled={disabled || busy}
            aria-label="Prioridad local"
          >
            <option value="">—</option>
            <option value="Alta">Alta</option>
            <option value="Media">Media</option>
            <option value="Baja">Baja</option>
          </select>
        </label>
        <button
          type="button"
          role="checkbox"
          aria-checked={done}
          disabled={disabled || busy}
          onClick={() =>
            void run(() =>
              patchTask(task.id, { status: done ? "needsAction" : "completed" }),
            )
          }
          className="inline-flex items-center gap-1 rounded-full border-2 border-[var(--color-border)] px-2 py-0.5 text-[10px] font-semibold text-[var(--color-text-primary)] transition-colors hover:border-[var(--agenda-reminder)] disabled:opacity-45"
          title={done ? "Marcar pendiente" : "Marcar realizada"}
        >
          {done ? (
            <>
              <span className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-[color-mix(in_srgb,var(--color-accent-health)_22%,transparent)] text-[var(--color-accent-health)]">
                <Check className="h-2.5 w-2.5" strokeWidth={2.5} aria-hidden />
              </span>
              Hecha
            </>
          ) : (
            "Marcar hecha"
          )}
        </button>
      </div>
      {err ? <p className="m-0 text-[10px] text-[var(--color-accent-danger)]">{err}</p> : null}
    </div>
  )
}
