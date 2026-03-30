"use client"

import { useState, type CSSProperties } from "react"
import Link from "next/link"
import { RefreshCw } from "lucide-react"
import { Card } from "@/src/components/ui/Card"
import type { GoogleTasksFeedState } from "@/app/hooks/useGoogleTasks"
import { browserBearerHeaders } from "@/lib/api/browserBearerHeaders"
import { messageForHttpError } from "@/lib/api/friendlyHttpError"
import { isAppMockMode, isSupabaseEnabled, UI_AGENDA_SYNC_OFF } from "@/lib/checkins/flags"

type GoogleAgendaPanelProps = {
  feed: GoogleTasksFeedState
  onAfterTasksSync?: () => void
  compact?: boolean
  /** Sin caja propia: para barra unificada junto a búsqueda (más denso). */
  inlineCompact?: boolean
  compactClassName?: string
}

const btnStyle: CSSProperties = {
  padding: "6px 10px",
  borderRadius: "10px",
  border: "0.5px solid var(--color-border)",
  background: "var(--color-surface-alt)",
  fontSize: "11px",
}

const btnDense: CSSProperties = {
  padding: "3px 8px",
  borderRadius: "8px",
  border: "0.5px solid var(--color-border)",
  background: "var(--color-surface-alt)",
  fontSize: "10px",
  lineHeight: 1.2,
}

export function GoogleAgendaPanel({
  feed,
  onAfterTasksSync,
  compact = false,
  inlineCompact = false,
  compactClassName,
}: GoogleAgendaPanelProps) {
  const { tasks, loading, error, connected, notice, creating, refresh, createTask } = feed
  const [title, setTitle] = useState("")
  const [syncingCal, setSyncingCal] = useState(false)
  const [syncingTasks, setSyncingTasks] = useState(false)
  const [syncMsg, setSyncMsg] = useState<string | null>(null)

  const runSync = async (kind: "calendar" | "tasks") => {
    if (isAppMockMode()) {
      setSyncMsg("Modo mock: sincronización simulada (sin llamadas a Google).")
      return
    }
    if (!isSupabaseEnabled()) {
      setSyncMsg(UI_AGENDA_SYNC_OFF)
      return
    }
    try {
      if (kind === "calendar") setSyncingCal(true)
      else setSyncingTasks(true)
      setSyncMsg(null)
      const headers = await browserBearerHeaders()
      const res = await fetch(`/api/integrations/google/${kind}/sync`, { method: "POST", headers })
      const payload = (await res.json()) as {
        success?: boolean
        imported?: number
        updated?: number
        mirroredAgenda?: number
        error?: string
      }
      if (!res.ok || !payload.success) {
        throw new Error(messageForHttpError(res.status, payload.error, res.statusText))
      }
      const base = `${kind === "calendar" ? "Calendario" : "Tareas"}: +${payload.imported ?? 0} nuevos, ${payload.updated ?? 0} actualizados`
      const mirror =
        kind === "tasks" && (payload.mirroredAgenda ?? 0) > 0
          ? ` · ${payload.mirroredAgenda} en Tareas compartidas`
          : ""
      setSyncMsg(`${base}.${mirror}`)
      await refresh()
      onAfterTasksSync?.()
    } catch (e) {
      setSyncMsg(e instanceof Error ? e.message : "Error")
    } finally {
      setSyncingCal(false)
      setSyncingTasks(false)
    }
  }

  const syncButtons = (labels: { cal: string; tasks: string }, dense: boolean, refreshIconOnly: boolean) => {
    const s = dense ? btnDense : btnStyle
    return (
      <>
        <button type="button" disabled={syncingCal} onClick={() => void runSync("calendar")} style={s}>
          {syncingCal ? (dense ? "Cal…" : "Calendario…") : labels.cal}
        </button>
        <button type="button" disabled={syncingTasks} onClick={() => void runSync("tasks")} style={s}>
          {syncingTasks ? (dense ? "Tar…" : "Tareas…") : labels.tasks}
        </button>
        <Link
          href="/configuracion"
          style={{
            ...s,
            textDecoration: "none",
            color: "var(--color-text-primary)",
            display: "inline-flex",
            alignItems: "center",
            alignSelf: "center",
          }}
        >
          {dense ? "Cuenta" : "Conectar Google"}
        </Link>
        <button
          type="button"
          disabled={loading}
          onClick={() => void refresh()}
          title="Actualizar Google"
          aria-label="Actualizar datos de Google Tasks"
          style={{
            ...s,
            padding: dense ? "3px 6px" : "6px 10px",
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {refreshIconOnly ? (
            <RefreshCw size={dense ? 13 : 14} strokeWidth={2} aria-hidden />
          ) : (
            "Actualizar vista Google"
          )}
        </button>
      </>
    )
  }

  /** Agenda integrada: solo importación manual y comprobación; crear tareas → «Nueva tarea». */
  if (compact) {
    if (inlineCompact) {
      return (
        <div
          className="ml-auto flex min-w-0 max-w-full flex-wrap items-center justify-end gap-x-1 gap-y-1"
          aria-label="Google: importar, cuenta y lista de Tasks"
        >
          <div className="flex flex-wrap items-center justify-end gap-1">{syncButtons({ cal: "Cal.", tasks: "Tareas" }, true, true)}</div>
          {notice ? (
            <span className="max-w-[14rem] truncate text-[10px] text-[var(--color-text-secondary)]">{notice}</span>
          ) : null}
          {error ? <span className="max-w-[14rem] truncate text-[10px] text-[var(--color-accent-danger)]">{error}</span> : null}
          {syncMsg ? (
            <span className="max-w-[18rem] truncate text-[10px] text-[var(--color-accent-health)]">{syncMsg}</span>
          ) : null}
          {loading ? (
            <span className="text-[10px] text-[var(--color-text-secondary)]">Tasks…</span>
          ) : (
            <details className="min-w-0 rounded-md border border-[var(--color-border)] bg-[var(--color-surface-alt)] px-2 py-0.5">
              <summary className="cursor-pointer list-none text-[10px] font-medium text-[var(--color-text-primary)] marker:content-none [&::-webkit-details-marker]:hidden">
                <span className="text-[var(--color-text-secondary)]">Tasks</span>
                <span className="ml-1 tabular-nums text-[var(--color-text-secondary)]">({tasks.length})</span>
              </summary>
              <ul className="mb-0 mt-1 max-h-[min(160px,32dvh)] list-disc space-y-0.5 overflow-y-auto pl-[14px] text-[10px] text-[var(--color-text-primary)]">
                {tasks.slice(0, 10).map((t) => (
                  <li key={t.id}>
                    <span className="break-words">{t.title}</span>
                    {t.due ? (
                      <span className="text-[var(--color-text-secondary)]" style={{ marginLeft: "4px" }}>
                        {t.due.slice(0, 10)}
                      </span>
                    ) : null}
                  </li>
                ))}
                {tasks.length === 0 && (
                  <li className="list-none pl-0 text-[var(--color-text-secondary)]">Sin Tasks o sin conexión.</li>
                )}
              </ul>
            </details>
          )}
        </div>
      )
    }

    return (
      <div
        role="region"
        aria-label="Sincronizar con Google: importar calendario y tareas, y revisar Tasks"
        className={
          compactClassName?.trim()
            ? compactClassName
            : "rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-[var(--shadow-card)]"
        }
        style={compactClassName?.trim() ? undefined : { borderWidth: "0.5px" }}
      >
        <div className="grid gap-2.5 p-3 sm:p-3.5">
          <div className="flex flex-wrap items-center gap-2">
            {syncButtons({ cal: "Importar calendario", tasks: "Importar tareas" }, false, false)}
          </div>
          {notice && <p className="m-0 text-[11px] text-[var(--color-text-secondary)]">{notice}</p>}
          {error && <p className="m-0 text-[11px] text-[var(--color-accent-danger)]">{error}</p>}
          {syncMsg && <p className="m-0 text-[11px] text-[var(--color-accent-health)]">{syncMsg}</p>}
          {loading ? (
            <p className="m-0 text-[12px] text-[var(--color-text-secondary)]">Cargando tareas…</p>
          ) : (
            <details className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-alt)] px-3 py-2">
              <summary className="cursor-pointer list-none text-[12px] font-medium text-[var(--color-text-primary)] marker:content-none [&::-webkit-details-marker]:hidden">
                <span className="text-[var(--color-text-secondary)]">Tu Google Tasks</span>
                <span className="ml-2 text-[11px] text-[var(--color-text-secondary)]">({tasks.length})</span>
              </summary>
              <ul className="mb-0 mt-2 max-h-[min(200px,38dvh)] list-disc space-y-1 overflow-y-auto pl-[18px] text-[12px] text-[var(--color-text-primary)]">
                {tasks.slice(0, 12).map((t) => (
                  <li key={t.id}>
                    {t.title}
                    {t.due ? (
                      <span className="text-[var(--color-text-secondary)]" style={{ marginLeft: "6px" }}>
                        ({t.due.slice(0, 10)})
                      </span>
                    ) : null}
                  </li>
                ))}
                {tasks.length === 0 && (
                  <li className="list-none pl-0 text-[var(--color-text-secondary)]">Sin tareas o Google no conectado.</li>
                )}
              </ul>
            </details>
          )}
        </div>
      </div>
    )
  }

  const inner = (
    <div style={{ padding: "var(--spacing-md)", display: "grid", gap: "var(--spacing-sm)" }}>
      <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: "10px" }}>
        <div>
          <p
            style={{
              margin: 0,
              fontSize: "11px",
              textTransform: "uppercase",
              letterSpacing: "0.14em",
              color: "var(--color-text-secondary)",
            }}
          >
            GOOGLE TASKS & SYNC
          </p>
          <p style={{ margin: "4px 0 0", fontSize: "12px", color: "var(--color-text-secondary)", lineHeight: 1.45 }}>
            Al abrir Agenda se sincronizan tareas y calendario con la nube. Las tareas personales que crees abajo también se
            envían a Google Tasks y a tu Google Calendar.
          </p>
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
          {syncButtons({ cal: "Sync cal → BD", tasks: "Sync tasks → BD" }, false, false)}
        </div>
      </div>
      {notice && <p style={{ margin: 0, fontSize: "11px", color: "var(--color-text-secondary)" }}>{notice}</p>}
      {error && <p style={{ margin: 0, fontSize: "11px", color: "var(--color-accent-danger)" }}>{error}</p>}
      {syncMsg && <p style={{ margin: 0, fontSize: "11px", color: "var(--color-accent-health)" }}>{syncMsg}</p>}
      <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Nueva tarea en Google…"
          style={{
            flex: "1 1 200px",
            padding: "8px 10px",
            borderRadius: "10px",
            border: "0.5px solid var(--color-border)",
            fontSize: "12px",
            background: "var(--agenda-elevated-bg, var(--color-surface))",
            color: "var(--color-text-primary)",
          }}
        />
        <button
          type="button"
          disabled={creating || !title.trim() || !connected}
          onClick={() => void createTask({ title }).then(() => setTitle(""))}
          style={{
            padding: "8px 14px",
            borderRadius: "10px",
            border: "none",
            background: connected ? "var(--color-accent-primary)" : "var(--color-border)",
            color: "white",
            fontSize: "12px",
            fontWeight: 600,
          }}
        >
          {creating ? "Creando…" : "Crear en Google"}
        </button>
        <button
          type="button"
          disabled={loading}
          onClick={() => void refresh()}
          style={{
            padding: "8px 12px",
            borderRadius: "10px",
            border: "0.5px solid var(--color-border)",
            background: "var(--agenda-elevated-bg, var(--color-surface))",
            fontSize: "12px",
          }}
        >
          Actualizar lista
        </button>
      </div>
      {loading ? (
        <p style={{ margin: 0, fontSize: "12px", color: "var(--color-text-secondary)" }}>Cargando tareas…</p>
      ) : (
        <ul style={{ margin: 0, paddingLeft: "18px", fontSize: "12px", color: "var(--color-text-primary)" }}>
          {tasks.slice(0, 12).map((t) => (
            <li key={t.id} style={{ marginBottom: "4px" }}>
              {t.title}
              {t.due ? (
                <span style={{ color: "var(--color-text-secondary)", marginLeft: "6px" }}>({t.due.slice(0, 10)})</span>
              ) : null}
            </li>
          ))}
          {tasks.length === 0 && <li style={{ color: "var(--color-text-secondary)" }}>Sin tareas o Google no conectado.</li>}
        </ul>
      )}
    </div>
  )

  return <Card>{inner}</Card>
}
