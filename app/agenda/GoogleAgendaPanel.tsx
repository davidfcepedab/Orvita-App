"use client"

import { useState } from "react"
import Link from "next/link"
import { Card } from "@/src/components/ui/Card"
import { useGoogleTasks } from "@/app/hooks/useGoogleTasks"
import { browserBearerHeaders } from "@/lib/api/browserBearerHeaders"
import { messageForHttpError } from "@/lib/api/friendlyHttpError"
import { isAppMockMode, isSupabaseEnabled, UI_AGENDA_SYNC_OFF } from "@/lib/checkins/flags"

export function GoogleAgendaPanel() {
  const { tasks, loading, error, connected, notice, creating, refresh, createTask } = useGoogleTasks()
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
      const payload = (await res.json()) as { success?: boolean; imported?: number; updated?: number; error?: string }
      if (!res.ok || !payload.success) {
        throw new Error(messageForHttpError(res.status, payload.error, res.statusText))
      }
      setSyncMsg(`${kind === "calendar" ? "Calendario" : "Tareas"}: +${payload.imported ?? 0} nuevos, ${payload.updated ?? 0} actualizados.`)
      await refresh()
    } catch (e) {
      setSyncMsg(e instanceof Error ? e.message : "Error")
    } finally {
      setSyncingCal(false)
      setSyncingTasks(false)
    }
  }

  return (
    <Card>
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
              Google Tasks &amp; sync
            </p>
            <p style={{ margin: "4px 0 0", fontSize: "12px", color: "var(--color-text-secondary)" }}>
              Lista predeterminada de Google. Sincroniza a Supabase para caché o usa la API en vivo desde esta vista.
            </p>
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
            <button
              type="button"
              disabled={syncingCal}
              onClick={() => void runSync("calendar")}
              style={{
                padding: "6px 10px",
                borderRadius: "10px",
                border: "0.5px solid var(--color-border)",
                background: "var(--color-surface-alt)",
                fontSize: "11px",
              }}
            >
              {syncingCal ? "Calendario…" : "Sync cal → BD"}
            </button>
            <button
              type="button"
              disabled={syncingTasks}
              onClick={() => void runSync("tasks")}
              style={{
                padding: "6px 10px",
                borderRadius: "10px",
                border: "0.5px solid var(--color-border)",
                background: "var(--color-surface-alt)",
                fontSize: "11px",
              }}
            >
              {syncingTasks ? "Tareas…" : "Sync tasks → BD"}
            </button>
            <Link
              href="/configuracion"
              style={{
                padding: "6px 10px",
                borderRadius: "10px",
                border: "0.5px solid var(--color-border)",
                fontSize: "11px",
                textDecoration: "none",
                color: "var(--color-text-primary)",
                alignSelf: "center",
              }}
            >
              Conectar Google
            </Link>
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
              background: "var(--color-surface)",
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
              background: "var(--color-surface)",
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
    </Card>
  )
}
