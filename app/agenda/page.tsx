"use client"

import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from "react"
import { Card } from "@/src/components/ui/Card"
import { CalendarDays, CalendarRange, LayoutGrid, ListChecks, Plus, Search } from "lucide-react"

import { GoogleAgendaPanel } from "@/app/agenda/GoogleAgendaPanel"
import { AgendaColorLegend } from "@/app/agenda/AgendaColorLegend"

import { useAgendaTasks } from "@/app/hooks/useAgendaTasks"
import { useGoogleCalendar } from "@/app/hooks/useGoogleCalendar"
import { useGoogleTasks } from "@/app/hooks/useGoogleTasks"
import { mapAgendaTaskToUi, priorityFormToApi, type UiAgendaTask } from "@/app/agenda/mapAgendaTaskToUi"
import { agendaPanelSurfaceStyle } from "@/app/agenda/agendaUiTokens"
import { priorityFilterControlStyle } from "@/app/agenda/agendaUnifiedCardStyles"
import { formatPriorityTitle } from "@/app/agenda/taskCardFormat"

import {
  AgendaSharedKanban,
  AgendaSharedList,
  AgendaSharedMonth,
  AgendaSharedWeek,
} from "@/app/agenda/AgendaSharedViews"

import { browserBearerHeaders } from "@/lib/api/browserBearerHeaders"
import { isAppMockMode, isSupabaseEnabled } from "@/lib/checkins/flags"
import {
  canRunGoogleCalendarSyncNow,
  markGoogleCalendarSyncRan,
} from "@/lib/google/googleCalendarSyncThrottle"
import type { HouseholdMemberDTO } from "@/lib/household/memberTypes"
import { createBrowserClient } from "@/lib/supabase/browser"
import { buildGoogleByDayIndex, type GoogleDayBucket } from "@/lib/agenda/googleAgendaByDay"
import { formatLocalDateKey } from "@/lib/agenda/localDateKey"

function pickViewerFirstName(
  user: { user_metadata?: Record<string, unknown>; email?: string | null } | null | undefined
): string | null {
  if (!user) return null
  const meta = user.user_metadata
  const fromMeta = [meta?.full_name, meta?.name].find((v) => typeof v === "string" && String(v).trim()) as string | undefined
  const raw = (fromMeta?.trim() || user.email?.split("@")[0]?.trim() || "").trim()
  if (!raw) return null
  const first = raw.split(/\s+/)[0]
  return first || null
}

function todayDateInputValue() {
  return formatLocalDateKey(new Date())
}

const tabs = [
  { key: "todas", label: "Todas" },
  { key: "recibida", label: "Recibidas" },
  { key: "asignada", label: "Asignadas" },
  { key: "personal", label: "Personales" },
]

const priorities = ["alta", "media", "baja"] as const
type Priority = typeof priorities[number]

function getWeekDays(base = new Date()) {
  const date = new Date(base)
  const day = date.getDay()
  const diff = day === 0 ? -6 : 1 - day
  date.setDate(date.getDate() + diff)
  return Array.from({ length: 7 }).map((_, idx) => {
    const d = new Date(date)
    d.setDate(date.getDate() + idx)
    return d
  })
}

function formatDayLabel(date: Date) {
  return date.toLocaleDateString("es-CO", { weekday: "short" })
}

function formatDateKey(date: Date) {
  return formatLocalDateKey(date)
}

function buildMonthGrid(date: Date) {
  const year = date.getFullYear()
  const month = date.getMonth()
  const first = new Date(year, month, 1)
  const last = new Date(year, month + 1, 0)
  const startOffset = (first.getDay() + 6) % 7
  const days = [] as { date: Date | null; key: string }[]
  for (let i = 0; i < startOffset; i += 1) {
    days.push({ date: null, key: `empty-${i}` })
  }
  for (let d = 1; d <= last.getDate(); d += 1) {
    const day = new Date(year, month, d)
    days.push({ date: day, key: formatDateKey(day) })
  }
  return days
}

type AgendaMainView = "columns" | "list" | "week" | "month"

const viewOptions = [
  { key: "columns" as const, label: "Columnas", description: "Flujo por tipo", icon: LayoutGrid, color: "var(--color-accent-finance)" },
  { key: "list" as const,    label: "Lista",    description: "Órvita + Google en una línea", icon: ListChecks, color: "var(--color-accent-health)" },
  { key: "week" as const,    label: "Semana",   description: "7 días", icon: CalendarDays, color: "var(--color-accent-warning)" },
  { key: "month" as const,   label: "Mes",      description: "Calendario mensual", icon: CalendarRange, color: "var(--color-accent-primary)" },
]

export default function AgendaPage() {
  const {
    tasks: agendaTasks,
    pendingAssignments,
    loading,
    error,
    refresh,
    createTask,
    updateTask,
    deleteTask,
  } = useAgendaTasks()
  const tasks = useMemo(() => agendaTasks.map(mapAgendaTaskToUi), [agendaTasks])
  const pendingUi = useMemo(
    () => pendingAssignments.map(mapAgendaTaskToUi),
    [pendingAssignments],
  )
  const googleCalendar = useGoogleCalendar()
  const googleTasksFeed = useGoogleTasks()

  const [viewerFirstName, setViewerFirstName] = useState<string | null>(null)
  const lastVisibilityPullRef = useRef(0)

  useEffect(() => {
    const supabase = createBrowserClient()
    const getUser = supabase.auth?.getUser
    if (typeof getUser !== "function") return
    void getUser()
      .then(({ data }) => setViewerFirstName(pickViewerFirstName(data?.user)))
      .catch(() => setViewerFirstName(null))
  }, [])

  const agendaTitle = viewerFirstName ? `Agenda ${viewerFirstName}` : "Tu agenda diaria"

  const agendaTagline = useMemo(() => {
    if (loading) return "Cargando tu tablero Órvita y datos de Google (Calendar / Tasks)…"
    const n = agendaTasks.length
    const active = agendaTasks.filter((t) => t.status !== "completed").length
    if (n === 0) return "Órvita y Google en un solo lugar: crea, importa o revisa la lista unificada (solo tu cuenta y tus asignaciones aceptadas)."
    if (active === 0) return "Sin pendientes en tu tablero Órvita."
    return `${active} pendiente${active === 1 ? "" : "s"} en Órvita. Las vistas combinan tu tablero con Calendar y Tasks de tu cuenta Google.`
  }, [loading, agendaTasks])

  useEffect(() => {
    if (isAppMockMode() || !isSupabaseEnabled()) return
    let cancelled = false
    const pull = async () => {
      try {
        const headers = await browserBearerHeaders(true)
        const doCalSync = canRunGoogleCalendarSyncNow()
        const calRes = doCalSync
          ? await fetch("/api/integrations/google/calendar/sync", { method: "POST", headers })
          : null
        if (calRes?.ok) markGoogleCalendarSyncRan()
        if (cancelled) return
        await refresh()
        await Promise.all([googleCalendar.refresh(), googleTasksFeed.refresh()])
      } catch {}
    }
    void pull()
    return () => {
      cancelled = true
    }
  }, [refresh, googleCalendar.refresh, googleTasksFeed.refresh])

  useEffect(() => {
    if (isAppMockMode() || !isSupabaseEnabled()) return
    const onVisible = () => {
      if (document.visibilityState !== "visible") return
      const now = Date.now()
      if (now - lastVisibilityPullRef.current < 300_000) return
      lastVisibilityPullRef.current = now
      void (async () => {
        try {
          const headers = await browserBearerHeaders(true)
          const doCalSync = canRunGoogleCalendarSyncNow()
          const calRes = doCalSync
            ? await fetch("/api/integrations/google/calendar/sync", { method: "POST", headers })
            : null
          if (calRes?.ok) markGoogleCalendarSyncRan()
          await refresh()
          await Promise.all([googleCalendar.refresh(), googleTasksFeed.refresh()])
        } catch {}
      })()
    }
    document.addEventListener("visibilitychange", onVisible)
    return () => document.removeEventListener("visibilitychange", onVisible)
  }, [refresh, googleCalendar.refresh, googleTasksFeed.refresh])

  const [tab, setTab] = useState("todas")
  const [priority, setPriority] = useState<Priority | "">("")
  const [view, setView] = useState<AgendaMainView>("list")
  const [query, setQuery] = useState("")
  const [selectedDay, setSelectedDay] = useState<string | null>(null)
  const [monthViewDate, setMonthViewDate] = useState(() => {
    const n = new Date()
    return new Date(n.getFullYear(), n.getMonth(), 1)
  })
  const [showPastAgenda, setShowPastAgenda] = useState(false)
  const [formOpen, setFormOpen] = useState(false)
  const [formSubmitError, setFormSubmitError] = useState<string | null>(null)
  const [householdMembers, setHouseholdMembers] = useState<HouseholdMemberDTO[]>([])
  const [membersLoadError, setMembersLoadError] = useState<string | null>(null)
  const [form, setForm] = useState({
    title: "",
    /** vacío = tarea personal (para mí) */
    assigneeMemberId: "",
    due: todayDateInputValue(),
    duration: 30,
    priority: "media" as "alta" | "media" | "baja",
  })

  useEffect(() => {
    if (!formOpen) return
    let cancelled = false
    void (async () => {
      setMembersLoadError(null)
      if (isAppMockMode() || !isSupabaseEnabled()) {
        setHouseholdMembers([])
        return
      }
      try {
        const headers = await browserBearerHeaders(true)
        const res = await fetch("/api/household/members", { cache: "no-store", headers })
        const json = (await res.json()) as { success?: boolean; data?: { members: HouseholdMemberDTO[] }; error?: string }
        if (cancelled) return
        if (!res.ok || !json.success || !json.data?.members) {
          setMembersLoadError(json.error || "No se pudieron cargar los miembros del hogar")
          setHouseholdMembers([])
          return
        }
        setHouseholdMembers(json.data.members)
      } catch {
        if (!cancelled) {
          setMembersLoadError("No se pudieron cargar los miembros del hogar")
          setHouseholdMembers([])
        }
      }
    })()
    return () => {
      cancelled = true
    }
  }, [formOpen])

  useEffect(() => {
    if (view !== "month") return
    const y = monthViewDate.getFullYear()
    const m = monthViewDate.getMonth()
    const start = new Date(y, m, 1)
    start.setDate(start.getDate() - 7)
    start.setHours(0, 0, 0, 0)
    const end = new Date(y, m + 1, 0)
    end.setDate(end.getDate() + 14)
    end.setHours(23, 59, 59, 999)
    void googleCalendar.refreshRange({ timeMin: start.toISOString(), timeMax: end.toISOString() })
  }, [view, monthViewDate, googleCalendar.refreshRange])

  const prevViewRef = useRef(view)
  useEffect(() => {
    if (prevViewRef.current === "month" && view !== "month") {
      void googleCalendar.refresh()
    }
    prevViewRef.current = view
  }, [view, googleCalendar.refresh])

  const filtered = useMemo(() => {
    const todayYmd = formatLocalDateKey(new Date())
    return tasks.filter((task) => {
      const tabMatch = tab === "todas" || task.type === tab
      const priorityMatch = !priority || task.priority === priority
      const queryMatch = !query || task.title.toLowerCase().includes(query.toLowerCase())
      const dateOk =
        showPastAgenda ||
        !task.due ||
        task.due.length < 10 ||
        task.due.slice(0, 10) >= todayYmd
      return tabMatch && priorityMatch && queryMatch && dateOk
    })
  }, [tab, priority, query, tasks, showPastAgenda])

  const googleByDay = useMemo(
    () => buildGoogleByDayIndex(googleCalendar, googleTasksFeed),
    [googleCalendar.connected, googleCalendar.events, googleTasksFeed.connected, googleTasksFeed.tasks]
  )

  const googleByDayForViews = useMemo(() => {
    if (showPastAgenda) return googleByDay
    const todayYmd = formatLocalDateKey(new Date())
    const out: Record<string, GoogleDayBucket> = {}
    for (const [k, v] of Object.entries(googleByDay)) {
      if (k.length === 10 && k >= todayYmd) out[k] = v
    }
    return out
  }, [googleByDay, showPastAgenda])

  const countByTab = (key: string) => {
    if (key === "todas") return tasks.length + pendingUi.length
    if (key === "recibida") {
      return tasks.filter((task) => task.type === "recibida").length + pendingUi.length
    }
    return tasks.filter((task) => task.type === key).length
  }

  const grouped = useMemo(() => ({
    recibida: filtered.filter((task) => task.type === "recibida"),
    asignada: filtered.filter((task) => task.type === "asignada"),
    personal: filtered.filter((task) => task.type === "personal"),
  }), [filtered])

  const { weekDays, weekMap } = useMemo(() => {
    const days = getWeekDays(new Date())
    const map: Record<string, typeof tasks> = {}
    days.forEach((day) => { map[formatDateKey(day)] = [] })
    filtered.forEach((task) => {
      if (task.due && map[task.due]) map[task.due].push(task)
    })
    return { weekDays: days, weekMap: map }
  }, [filtered])

  const totalWeeklyTasks = weekDays.reduce((acc, day) => acc + (weekMap[formatDateKey(day)]?.length ?? 0), 0)
  const totalWeeklyMinutes = weekDays.reduce(
    (acc, day) => acc + (weekMap[formatDateKey(day)]?.reduce((sum, t) => sum + t.duration, 0) ?? 0),
    0
  )
  const totalWeeklyCompleted = weekDays.reduce(
    (acc, day) => acc + (weekMap[formatDateKey(day)]?.filter((t) => t.completed).length ?? 0),
    0
  )
  const totalWeeklyPending = totalWeeklyTasks - totalWeeklyCompleted

  const monthGrid = useMemo(() => buildMonthGrid(monthViewDate), [monthViewDate])
  const monthLabel = useMemo(() => {
    const raw = monthViewDate.toLocaleDateString("es-CO", { month: "long", year: "numeric" })
    return raw.charAt(0).toUpperCase() + raw.slice(1)
  }, [monthViewDate])
  const monthSummary = useMemo(() => {
    const total = filtered.length
    const completed = filtered.filter((t) => t.status === "completada").length
    const hours = Math.round(filtered.reduce((acc, t) => acc + t.duration, 0) / 60)
    return { total, completed, hours }
  }, [filtered])

  const dayDetails = selectedDay ? filtered.filter((t) => t.due === selectedDay) : []

  const handleCreateTask = async (event: FormEvent) => {
    event.preventDefault()
    if (!form.title.trim()) return
    setFormSubmitError(null)
    const mid = form.assigneeMemberId.trim()
    let assigneeId: string | null = null
    let assigneeName: string | null = null
    if (mid) {
      const m = householdMembers.find((x) => x.id === mid)
      if (!m) {
        setFormSubmitError("Elige un miembro válido del hogar o deja «Para mí».")
        return
      }
      assigneeId = m.id
      assigneeName = (m.displayName?.trim() || m.email?.trim() || null) as string | null
    }
    try {
      await createTask({
        title: form.title.trim(),
        priority: priorityFormToApi(form.priority),
        estimatedMinutes: Number(form.duration) || 30,
        dueDate: form.due ? form.due : null,
        assigneeName,
        assigneeId,
      })
      setFormOpen(false)
      setForm({
        title: "",
        assigneeMemberId: "",
        due: todayDateInputValue(),
        duration: 30,
        priority: "media",
      })
    } catch (e) {
      setFormSubmitError(e instanceof Error ? e.message : "No se pudo crear la tarea")
    }
  }

  const onAcceptAssignment = useCallback(
    async (t: UiAgendaTask) => {
      await updateTask(t.id, { acceptAssignment: true })
    },
    [updateTask],
  )

  const saveTaskComplete = (taskId: string, completed: boolean) =>
    updateTask(taskId, { status: completed ? "completed" : "pending" })

  const onGoogleTaskSetDue = useCallback(
    async (taskId: string, dueYmd: string) => {
      const result = await googleTasksFeed.patchTask(taskId, { due: dueYmd })
      if (!result) throw new Error("No se pudo guardar en Google Tasks")
    },
    [googleTasksFeed],
  )

  const onDeleteOrvitaTask = useCallback(
    async (t: UiAgendaTask) => {
      await deleteTask(t.id)
    },
    [deleteTask],
  )

  const onDeleteCalendarEvent = useCallback(
    async (eventId: string) => {
      const ok = await googleCalendar.deleteEvent(eventId)
      if (!ok && googleCalendar.error) {
        window.alert(googleCalendar.error)
      }
    },
    [googleCalendar],
  )

  const onDeleteGoogleTask = useCallback(
    async (taskId: string) => {
      const ok = await googleTasksFeed.removeTask(taskId)
      if (!ok && googleTasksFeed.error) {
        window.alert(googleTasksFeed.error)
      }
    },
    [googleTasksFeed],
  )

  return (
    <>
      <section
        aria-label="Agenda unificada"
        className="overflow-hidden rounded-[var(--radius-card)] border border-[var(--color-border)] shadow-card"
        style={{ borderWidth: "0.5px", background: "var(--agenda-shell-bg)" }}
      >
        <header
          className="flex flex-col gap-4 border-b border-[var(--color-border)] px-5 pb-4 pt-5 sm:flex-row sm:items-center sm:justify-between lg:px-8 lg:pb-5 lg:pt-7"
          style={{ background: "var(--agenda-elevated-bg)" }}
        >
          <div>
            <h1 className="m-0 text-[26px] font-medium tracking-tight text-[var(--color-text-primary)] lg:text-[28px]">
              {agendaTitle}
            </h1>
            <p className="m-0 mt-1.5 min-h-[3.25rem] max-w-xl text-[13px] leading-snug text-[var(--color-text-secondary)] sm:min-h-[2.75rem]">
              {agendaTagline}
            </p>
          </div>
          <div className="flex shrink-0 flex-wrap gap-2 sm:gap-[var(--spacing-sm)]">
            <button
              type="button"
              onClick={() => setFormOpen(true)}
              className="inline-flex items-center gap-2 rounded-[10px] border border-[var(--color-border)] px-3.5 py-2 text-[12px] font-semibold uppercase tracking-[0.12em] text-white"
              style={{ background: "var(--agenda-assigned)" }}
            >
              <Plus size={14} /> Nueva Tarea
            </button>
          </div>
        </header>

        {error ? (
          <div
            className="flex items-center justify-between gap-3 border-b border-[var(--color-border)] px-5 py-3 text-[13px] lg:px-8"
            style={{
              background: "color-mix(in srgb, var(--color-accent-danger) 10%, var(--agenda-shell-bg))",
              color: "var(--color-accent-danger)",
            }}
          >
            <span>{error}</span>
            <button
              type="button"
              onClick={() => void refresh()}
              className="shrink-0 cursor-pointer rounded-lg border border-[var(--color-border)] px-2.5 py-1.5 text-[12px]"
              style={{ background: "var(--agenda-elevated-bg)" }}
            >
              Reintentar
            </button>
          </div>
        ) : null}

        <div
          className="sticky z-10 border-b border-[var(--color-border)] px-5 py-3 lg:px-8"
          style={{ top: "84px", background: "var(--agenda-shell-bg)" }}
        >
          <div className="flex flex-col gap-2">
            <div
              className="rounded-xl border border-[var(--color-border)] px-3 py-2 sm:px-3.5 sm:py-2.5"
              style={agendaPanelSurfaceStyle}
              role="region"
              aria-label="Buscar, sincronizar Google y filtros"
            >
              <div className="flex w-full min-w-0 flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:gap-x-3 sm:gap-y-2">
                <div className="flex min-h-[40px] min-w-0 w-full flex-1 items-center gap-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-alt)] px-2.5 py-1.5 sm:min-w-[12rem] sm:max-w-xl">
                  <Search size={14} className="shrink-0 text-[var(--color-text-secondary)]" aria-hidden />
                  <input
                    placeholder="Buscar…"
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    className="min-w-0 flex-1 border-0 bg-transparent text-[13px] text-[var(--color-text-primary)] outline-none placeholder:text-[var(--color-text-secondary)] sm:text-[12px]"
                  />
                </div>
                <div className="flex w-full min-w-0 flex-wrap items-center gap-x-1 gap-y-1 sm:w-auto sm:flex-[0_1_auto] sm:justify-end">
                  <GoogleAgendaPanel
                    feed={googleTasksFeed}
                    compact
                    inlineCompact
                    onAfterTasksSync={() => {
                      void refresh()
                      void googleCalendar.refresh()
                      void googleTasksFeed.refresh()
                    }}
                  />
                </div>
              </div>
              <div className="mt-2 flex flex-col gap-2 border-t border-[var(--color-border)] pt-2 sm:mt-2 sm:flex-row sm:flex-wrap sm:items-center sm:gap-x-3 sm:gap-y-1.5 sm:pt-2">
                <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
                  <AgendaColorLegend inline omitHeading sourcesOnly dense />
                </div>
                <span className="hidden h-3.5 w-px shrink-0 self-stretch bg-[var(--color-border)] sm:block" aria-hidden />
                <div className="flex min-w-0 flex-wrap gap-1">
                  {tabs.map((item) => (
                    <button
                      key={item.key}
                      type="button"
                      onClick={() => setTab(item.key)}
                      className="inline-flex min-h-9 items-center gap-1 rounded-full border border-[var(--color-border)] px-2.5 py-1 text-[10px] sm:min-h-0 sm:px-2 sm:py-0.5"
                      style={{
                        background: tab === item.key ? "var(--color-surface-alt)" : "transparent",
                        color: tab === item.key ? "var(--color-text-primary)" : "var(--color-text-secondary)",
                        boxShadow:
                          tab === item.key ? "inset 0 0 0 1px color-mix(in srgb, var(--color-border) 80%, transparent)" : undefined,
                      }}
                    >
                      {item.label}
                      <span className="tabular-nums text-[9px] text-[var(--color-text-secondary)]">{countByTab(item.key)}</span>
                    </button>
                  ))}
                </div>
                <span className="hidden h-3.5 w-px shrink-0 self-stretch bg-[var(--color-border)] lg:block" aria-hidden />
                <div className="flex w-full min-w-0 flex-wrap items-center gap-2 lg:ml-auto lg:w-auto lg:justify-end">
                  <button
                    type="button"
                    onClick={() => setShowPastAgenda((v) => !v)}
                    className="min-h-9 rounded-full border border-[var(--color-border)] px-2.5 py-1 text-[9px] font-medium uppercase tracking-[0.08em] sm:min-h-0 sm:px-2 sm:py-0.5"
                    style={{
                      background: showPastAgenda ? "var(--color-surface-alt)" : "transparent",
                      color: showPastAgenda ? "var(--color-text-primary)" : "var(--color-text-secondary)",
                    }}
                    title="Muestra ítems con fecha anterior a hoy"
                  >
                    {showPastAgenda ? "Ocultar pasado" : "Ver fechas anteriores"}
                  </button>
                  {priorities.map((item) => (
                    <button
                      key={item}
                      type="button"
                      onClick={() => setPriority(priority === item ? "" : item)}
                      className="min-h-9 rounded-full px-2.5 py-1 text-[9px] uppercase tracking-[0.1em] sm:min-h-0 sm:px-2 sm:py-0.5"
                      style={priorityFilterControlStyle(item, priority === item)}
                    >
                      {formatPriorityTitle(item)}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-[var(--color-border)] p-1.5 sm:p-2" style={agendaPanelSurfaceStyle}>
              <div className="grid grid-cols-2 gap-1 min-[440px]:grid-cols-4">
                {viewOptions.map((item) => {
                  const Icon = item.icon
                  const active = view === item.key
                  return (
                    <button
                      key={item.key}
                      type="button"
                      title={item.description}
                      aria-label={`${item.label}: ${item.description}`}
                      onClick={() => setView(item.key)}
                      className="flex min-h-[48px] flex-col items-center justify-center gap-1 rounded-lg px-1.5 py-2 text-center transition-[background-color,border-color] duration-150 min-[440px]:min-h-[44px] min-[440px]:gap-0.5 min-[440px]:py-1.5"
                      style={{
                        border: active ? `1.5px solid ${item.color}` : "1px solid var(--color-border)",
                        background: active
                          ? `color-mix(in srgb, ${item.color} 12%, var(--color-surface-alt))`
                          : "var(--color-surface-alt)",
                      }}
                    >
                      <Icon size={16} strokeWidth={2} style={{ color: item.color }} aria-hidden />
                      <span
                        className="m-0 max-w-full truncate px-0.5 text-[11px] font-semibold leading-tight min-[440px]:text-[10px]"
                        style={{ color: active ? "var(--color-text-primary)" : "var(--color-text-secondary)" }}
                      >
                        {item.label}
                      </span>
                    </button>
                  )
                })}
              </div>
            </div>
          </div>
        </div>

        <div
          className="unified-agenda-container flex min-w-0 flex-col gap-4 px-5 py-6 md:gap-6 lg:px-8 lg:py-8"
          style={{ background: "var(--agenda-shell-bg)" }}
        >
          <div
            className="flex min-h-[min(420px,55dvh)] min-w-0 flex-1 flex-col gap-4 md:gap-6"
            aria-label="Agenda: vista activa con Órvita y Google"
          >
            <div className="flex min-h-[min(320px,48dvh)] flex-1 flex-col">
              {view === "columns" && (
                <AgendaSharedKanban
                  grouped={grouped}
                  pendingInvites={pendingUi}
                  calendarFeed={googleCalendar}
                  googleTasksFeed={googleTasksFeed}
                  hideBeforeToday={!showPastAgenda}
                  onSaveComplete={(task, completed) => saveTaskComplete(task.id, completed)}
                  onGoogleTaskSetDue={googleTasksFeed.connected ? onGoogleTaskSetDue : undefined}
                  onDeleteOrvitaTask={onDeleteOrvitaTask}
                  onDeleteCalendarEvent={googleCalendar.connected ? onDeleteCalendarEvent : undefined}
                  onDeleteGoogleTask={googleTasksFeed.connected ? onDeleteGoogleTask : undefined}
                  onAcceptAssignment={onAcceptAssignment}
                />
              )}
              {view === "list" && (
                <AgendaSharedList
                  filtered={filtered}
                  pendingInvites={pendingUi}
                  calendarFeed={googleCalendar}
                  googleTasksFeed={googleTasksFeed}
                  agendaLoading={loading}
                  hideBeforeToday={!showPastAgenda}
                  onSaveComplete={(task, completed) => saveTaskComplete(task.id, completed)}
                  onGoogleTaskSetDue={googleTasksFeed.connected ? onGoogleTaskSetDue : undefined}
                  onDeleteOrvitaTask={onDeleteOrvitaTask}
                  onDeleteCalendarEvent={googleCalendar.connected ? onDeleteCalendarEvent : undefined}
                  onDeleteGoogleTask={googleTasksFeed.connected ? onDeleteGoogleTask : undefined}
                  onAcceptAssignment={onAcceptAssignment}
                />
              )}
              {view === "week" && (
                <AgendaSharedWeek
                  weekDays={weekDays}
                  weekMap={weekMap}
                  totalWeeklyTasks={totalWeeklyTasks}
                  totalWeeklyCompleted={totalWeeklyCompleted}
                  totalWeeklyPending={totalWeeklyPending}
                  totalWeeklyMinutes={totalWeeklyMinutes}
                  formatDateKey={formatDateKey}
                  formatDayLabel={formatDayLabel}
                  googleByDay={googleByDayForViews}
                />
              )}
              {view === "month" && (
                <AgendaSharedMonth
                  monthGrid={monthGrid}
                  monthLabel={monthLabel}
                  monthSummary={monthSummary}
                  tasks={filtered}
                  selectedDay={selectedDay}
                  onSelectDay={setSelectedDay}
                  dayDetails={dayDetails}
                  formatDateKey={formatDateKey}
                  googleByDay={googleByDayForViews}
                  onPrevMonth={() =>
                    setMonthViewDate((d) => new Date(d.getFullYear(), d.getMonth() - 1, 1))
                  }
                  onNextMonth={() =>
                    setMonthViewDate((d) => new Date(d.getFullYear(), d.getMonth() + 1, 1))
                  }
                  onGoThisMonth={() => {
                    const n = new Date()
                    setMonthViewDate(new Date(n.getFullYear(), n.getMonth(), 1))
                  }}
                />
              )}
            </div>
          </div>
        </div>
      </section>

      {formOpen && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(15, 23, 42, 0.35)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 50,
          }}
        >
          <Card className="mx-4 w-full max-w-lg p-4 sm:mx-0 sm:p-6" hover>
            <form onSubmit={(e) => void handleCreateTask(e)} className="grid w-full min-w-0 gap-3">
              {formSubmitError && (
                <p style={{ margin: 0, fontSize: "12px", color: "var(--color-accent-danger)" }}>{formSubmitError}</p>
              )}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div>
                  <p style={{ margin: 0, fontSize: "12px", textTransform: "uppercase", letterSpacing: "0.12em", color: "var(--color-text-secondary)" }}>
                    Nueva tarea
                  </p>
                  <p style={{ margin: "4px 0 0", fontSize: "14px", fontWeight: 600 }}>Creación y asignación</p>
                </div>
                <button
                  type="button"
                  onClick={() => setFormOpen(false)}
                  style={{
                    border: "none",
                    background: "transparent",
                    color: "var(--color-text-secondary)",
                    fontSize: "12px",
                  }}
                >
                  Cerrar
                </button>
              </div>

              <input
                placeholder="Título de la tarea"
                value={form.title}
                onChange={(event) => setForm((prev) => ({ ...prev, title: event.target.value }))}
                style={{ padding: "10px 12px", borderRadius: "10px", border: "0.5px solid var(--color-border)" }}
              />
              {membersLoadError ? (
                <p style={{ margin: 0, fontSize: "12px", color: "var(--color-accent-warning)" }}>{membersLoadError}</p>
              ) : null}
              <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 sm:gap-2.5">
                <label className="grid gap-1 text-[12px] text-[var(--color-text-secondary)]">
                  <span>Asignar a</span>
                  <select
                    value={form.assigneeMemberId}
                    onChange={(event) => setForm((prev) => ({ ...prev, assigneeMemberId: event.target.value }))}
                    style={{ padding: "10px 12px", borderRadius: "10px", border: "0.5px solid var(--color-border)", background: "var(--color-surface)" }}
                  >
                    <option value="">Para mí (personal)</option>
                    {householdMembers.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.displayName?.trim() || m.email || m.id.slice(0, 8)}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="grid gap-1 text-[12px] text-[var(--color-text-secondary)]">
                  <span>Vence</span>
                  <input
                    type="date"
                    value={form.due}
                    onChange={(event) => setForm((prev) => ({ ...prev, due: event.target.value }))}
                    style={{ padding: "10px 12px", borderRadius: "10px", border: "0.5px solid var(--color-border)" }}
                  />
                </label>
              </div>
              <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 sm:gap-2.5">
                <label className="grid gap-1 text-[12px] text-[var(--color-text-secondary)]">
                  <span>Prioridad</span>
                  <select
                    value={form.priority}
                    onChange={(event) =>
                      setForm((prev) => ({
                        ...prev,
                        priority: event.target.value as "alta" | "media" | "baja",
                      }))
                    }
                    style={{ padding: "10px 12px", borderRadius: "10px", border: "0.5px solid var(--color-border)", background: "var(--color-surface)" }}
                  >
                    <option value="alta">Alta</option>
                    <option value="media">Media</option>
                    <option value="baja">Baja</option>
                  </select>
                </label>
                <label className="grid gap-1 text-[12px] text-[var(--color-text-secondary)]">
                  <span>Duración (min)</span>
                  <input
                    type="number"
                    min={5}
                    value={form.duration}
                    onChange={(event) => setForm((prev) => ({ ...prev, duration: Number(event.target.value) }))}
                    style={{ padding: "10px 12px", borderRadius: "10px", border: "0.5px solid var(--color-border)" }}
                  />
                </label>
              </div>
              <p style={{ margin: 0, fontSize: "11px", color: "var(--color-text-secondary)", lineHeight: 1.45 }}>
                Si asignas a otro miembro, verá la tarea en Inicio para aceptarla; tú verás el estado en la columna «Asignadas por mí».
              </p>
              <button
                type="submit"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  padding: "10px 14px",
                  borderRadius: "10px",
                  border: "0.5px solid var(--color-border)",
                  background: "var(--color-accent-health)",
                  color: "white",
                  fontSize: "12px",
                  fontWeight: 600,
                  textTransform: "uppercase",
                  letterSpacing: "0.12em",
                }}
              >
                Crear tarea
              </button>
            </form>
          </Card>
        </div>
      )}
    </>
  )
}
