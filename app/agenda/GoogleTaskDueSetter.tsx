"use client"

import { useState } from "react"

type Props = {
  taskId: string
  patchDue: (taskId: string, dueDateYmd: string) => Promise<void>
  disabled?: boolean
}

export function GoogleTaskDueSetter({ taskId, patchDue, disabled }: Props) {
  const [date, setDate] = useState("")
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  const submit = async () => {
    if (!date || disabled) return
    setBusy(true)
    setErr(null)
    try {
      await patchDue(taskId, date)
      setDate("")
    } catch (e) {
      setErr(e instanceof Error ? e.message : "No se pudo guardar")
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <input
        type="date"
        value={date}
        onChange={(e) => setDate(e.target.value)}
        disabled={disabled || busy}
        className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-2 py-1 text-[10px] text-[var(--color-text-primary)]"
        aria-label="Fecha de vencimiento para Google Task"
      />
      <button
        type="button"
        disabled={!date || busy || disabled}
        onClick={() => void submit()}
        className="rounded-lg border border-[var(--color-border)] bg-[var(--agenda-reminder)] px-2 py-1 text-[10px] font-semibold text-white disabled:opacity-45"
      >
        {busy ? "Guardando…" : "Guardar en Google"}
      </button>
      {err ? <span className="text-[10px] text-[var(--color-accent-danger)]">{err}</span> : null}
    </div>
  )
}
