"use client"

import { Suspense, useCallback, useDeferredValue, useEffect, useMemo, useRef, useState, type FormEvent } from "react"
import { Card } from "@/src/components/ui/Card"
import { CalendarDays, CalendarRange, ChevronDown, ChevronUp, LayoutGrid, ListChecks, Plus, Search, SlidersHorizontal } from "lucide-react"

import { GoogleAgendaPanel } from "@/app/agenda/GoogleAgendaPanel"
import { AgendaColorLegend } from "@/app/agenda/AgendaColorLegend"
import { AgendaTrainingSuggestPanel } from "@/app/agenda/AgendaTrainingSuggestPanel"

import { useAgendaTasks, type AgendaTaskPriority } from "@/app/hooks/useAgendaTasks"
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
import { AgendaTaskEditModal, type AgendaEditModalTarget } from "@/app/agenda/AgendaTaskEditModal"
import { TaskCardIterationProvider } from "@/app/agenda/TaskCardIterationContext"
import { useSessionCalendarDone } from "@/app/hooks/useSessionCalendarDone"

import { browserBearerHeaders } from "@/lib/api/browserBearerHeaders"
import { isAppMockMode, isSupabaseEnabled } from "@/lib/checkins/flags"
import {
  canRunGoogleCalendarSyncNow,
  markGoogleCalendarSyncRan,
} from "@/lib/google/googleCalendarSyncThrottle"
import type { HouseholdMemberDTO } from "@/lib/household/memberTypes"
import { createBrowserClient } from "@/lib/supabase/browser"
import { buildGoogleByDayIndex, type GoogleDayBucket } from "@/lib/agenda/googleAgendaByDay"
import type { GoogleTaskLocalPriority } from "@/lib/google/types"
import { addDaysToYmd } from "@/lib/agenda/agendaDueShift"
import { addCalendarMonthsYm } from "@/lib/agenda/calendarMath"
import { getAgendaDisplayTimeZone } from "@/lib/agenda/agendaTimeZone"
import { agendaTodayYmd, formatLocalDateKey } from "@/lib/agenda/localDateKey"
import { mondayOfCalendarWeekContainingYmd, weekdayMonday0ForAgendaYmd } from "@/lib/agenda/unifiedListHorizon"

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
  return agendaTodayYmd()
}

const tabs = [
  { key: "todas", label: "Todas" },
  { key: "recibida", label: "Recibidas" },
  { key: "asignada", label: "Asignadas" },
  { key: "compartida", label: "Compartidas hogar" },
  { key: "personal", label: "Personales" },
]

const priorities = ["alta", "media", "baja"] as const
type Priority = typeof priorities[number]

function getWeekDays(base: Date = new Date()) {
  const todayKey = formatLocalDateKey(base)
  const mon = mondayOfCalendarWeekContainingYmd(todayKey)
  return Array.from({ length: 7 }, (_, idx) => {
    const ymd = addDaysToYmd(mon, idx)
    const [y, m, d] = ymd.split("-").map(Number)
    return new Date(Date.UTC(y, m - 1, d, 12, 0, 0))
  })
}

type AgendaWeekScope = "work" | "full"

function readWeekScopePref(): AgendaWeekScope {
  if (typeof window === "undefined") return "work"
  try {
    const v = localStorage.getItem("orbita.agenda.weekScope")
    return v === "full" ? "full" : "work"
  } catch {
    return "work"
  }
}

function formatDayLabel(date: Date) {
  return new Intl.DateTimeFormat("es-CO", {
    timeZone: getAgendaDisplayTimeZone(),
    weekday: "short",
  }).format(date)
}

function formatDateKey(date: Date) {
  return formatLocalDateKey(date)
}

/** Rejilla mensual: mes civil `YYYY-MM` en la zona de agenda (`NEXT_PUBLIC_AGENDA_DISPLAY_TZ`). */
function buildMonthGridFromYm(ym: string) {
  const trimmed = ym.trim().slice(0, 7)
  if (!/^\d{4}-\d{2}$/.test(trimmed)) return [] as { date: Date | null; key: string }[]
  const [year, month] = trimmed.split("-").map(Number)
  const ymdFirst = `${year}-${String(month).padStart(2, "0")}-01`
  const startOffset = weekdayMonday0ForAgendaYmd(ymdFirst)
  const lastDay = new Date(Date.UTC(year, month, 0, 12, 0, 0)).getUTCDate()
  const days: { date: Date | null; key: string }[] = []
  for (let i = 0; i < startOffset; i += 1) {
    days.push({ date: null, key: `empty-${i}` })
  }
  for (let d = 1; d <= lastDay; d += 1) {
    const key = `${year}-${String(month).padStart(2, "0")}-${String(d).padStart(2, "0")}`
    days.push({ date: new Date(Date.UTC(year, month - 1, d, 12, 0, 0)), key })
  }
  return days
}

type AgendaMainView = "columns" | "list" | "week" | "month"

const viewOptions = [
  { key: "columns" as const, label: "Columnas", description: "Flujo por tipo", icon: LayoutGrid, color: "var(--color-accent-finance)" },
  { key: "list" as const,    label: "Lista",    description: "Órvita + Google en una línea", icon: ListChecks, color: "var(--color-accent-health)" },
  { key: "week" as const,    label: "Semana",   description: "Lun–vie o 7 días", icon: CalendarDays, color: "var(--color-accent-warning)" },
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
  const { isCalendarUiDone, toggleCalendarUiDone } = useSessionCalendarDone()

  const [viewerFirstName, setViewerFirstName] = useState<string | null>(null)
  const [viewerUserId, setViewerUserId] = useState<string | null>(null)
  const [weekScope, setWeekScope] = useState<AgendaWeekScope>(() => readWeekScopePref())
  const [agendaEditTarget, setAgendaEditTarget] = useState<AgendaEditModalTarget | null>(null)
  const lastVisibilityPullRef = useRef(0)

  useEffect(() => {
    const supabase = createBrowserClient()
    const getUser = supabase.auth?.getUser
    if (typeof getUser !== "function") return
    void getUser()
      .then(({ data }) => {
        setViewerFirstName(pickViewerFirstName(data?.user))
        const uid = data?.user && "id" in data.user ? String(data.user.id) : null
        setViewerUserId(uid)
      })
      .catch(() => {
        setViewerFirstName(null)
        setViewerUserId(null)
      })
  }, [])

  useEffect(() => {
    try {
      localStorage.setItem("orbita.agenda.weekScope", weekScope)
    } catch {
      /* ignore */
    }
  }, [weekScope])

  const agendaTitle = viewerFirstName ? `Agenda ${viewerFirstName}` : "Tu agenda diaria"

  const agendaTagline = useMemo(() => {
    if (loading) return "Cargando tu agenda unificada…"
    const n = agendaTasks.length
    const active = agendaTasks.filter((t) => t.status !== "completed").length
    if (n === 0)
      return "Aquí conviven tus tareas Órvita y lo que traes de Google. Crea una tarea o conecta la cuenta en Configuración."
    if (active === 0) return "No hay pendientes en tu tablero Órvita."
    return `${active} pendiente${active === 1 ? "" : "s"} en Órvita. Las vistas mezclan tablero, calendario y recordatorios de tu Google.`
  }, [loading, agendaTasks])

  useEffect(() => {
    if (isAppMockMode() || !isSupabaseEnabled()) return
    let cancelled = false
    const pull = async () => {
      try {
        if (cancelled) return
        // No llamar `refresh()` aquí: `useAgendaTasks` ya carga en mount; duplicar bloqueaba el hilo e inflaba INP.
        const headers = await browserBearerHeaders(true)
        const doCalSync = canRunGoogleCalendarSyncNow()
        const calRes = doCalSync
          ? await fetch("/api/integrations/google/calendar/sync", { method: "POST", headers })
          : null
        if (cancelled) return
        if (calRes?.ok) markGoogleCalendarSyncRan()
        if (cancelled) return
        await Promise.all([googleCalendar.refresh(), googleTasksFeed.refresh()])
      } catch {}
    }
    // Retrasar sync/refresco Google para no competir con el primer pintado y la primera interacción.
    const t = window.setTimeout(() => {
      if (!cancelled) void pull()
    }, 2000)
    return () => {
      cancelled = true
      window.clearTimeout(t)
    }
  }, [googleCalendar.refresh, googleTasksFeed.refresh])

  useEffect(() => {
    if (isAppMockMode() || !isSupabaseEnabled()) return
    const onVisible = () => {
      if (document.visibilityState !== "visible") return
      const now = Date.now()
      if (now - lastVisibilityPullRef.current < 300_000) return
      lastVisibilityPullRef.current = now
      void (async () => {
        try {
          await refresh()
          const headers = await browserBearerHeaders(true)
          const doCalSync = canRunGoogleCalendarSyncNow()
          const calRes = doCalSync
            ? await fetch("/api/integrations/google/calendar/sync", { method: "POST", headers })
            : null
          if (calRes?.ok) markGoogleCalendarSyncRan()
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
  const deferredQuery = useDeferredValue(query)
  const [selectedDay, setSelectedDay] = useState<string | null>(null)
  const [monthViewYm, setMonthViewYm] = useState(() => agendaTodayYmd().slice(0, 7))
  const [showPastAgenda, setShowPastAgenda] = useState(false)
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false)
  const [formOpen, setFormOpen] = useState(false)
  const [formSubmitError, setFormSubmitError] = useState<string | null>(null)
  const [householdMembers, setHouseholdMembers] = useState<HouseholdMemberDTO[]>([])
  const [membersLoadError, setMembersLoadError] = useState<string | null>(null)
  const [form, setForm] = useState({
    title: "",
    /** vacío = tarea personal (para mí) */
    assigneeMemberId: "",
    /** Una sola fila visible para todo el hogar (no sustituye asignar a una persona). */
    householdShared: false,
    due: todayDateInputValue(),
    duration: 30,
    priority: "media" as "alta" | "media" | "baja",
  })

  const mobileFilterCount = useMemo(() => {
    let n = 0
    if (tab !== "todas") n += 1
    if (priority) n += 1
    if (showPastAgenda) n += 1
    if (query.trim()) n += 1
    return n
  }, [tab, priority, showPastAgenda, query])

  // Cargar miembros al entrar en la agenda (no solo al abrir el formulario): sin esto no hay
  // selector de responsable ni barra rápida en recordatorios Google.
  useEffect(() => {
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
  }, [])

  useEffect(() => {
    if (view !== "month") return
    const trimmed = monthViewYm.trim().slice(0, 7)
    if (!/^\d{4}-\d{2}$/.test(trimmed)) return
    const [y, mo] = trimmed.split("-").map(Number)
    const firstYmd = `${y}-${String(mo).padStart(2, "0")}-01`
    const lastDay = new Date(Date.UTC(y, mo, 0, 12, 0, 0)).getUTCDate()
    const lastYmd = `${y}-${String(mo).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`
    const rangeStartYmd = addDaysToYmd(firstYmd, -7)
    const rangeEndYmd = addDaysToYmd(lastYmd, 14)
    void googleCalendar.refreshRange({
      timeMin: `${rangeStartYmd}T12:00:00.000Z`,
      timeMax: `${rangeEndYmd}T12:00:00.000Z`,
    })
  }, [view, monthViewYm, googleCalendar.refreshRange])

  const prevViewRef = useRef(view)
  useEffect(() => {
    if (prevViewRef.current === "month" && view !== "month") {
      void googleCalendar.refresh()
    }
    prevViewRef.current = view
  }, [view, googleCalendar.refresh])

  const filtered = useMemo(() => {
    const todayYmd = agendaTodayYmd()
    const currentYm = todayYmd.slice(0, 7)
    const q = deferredQuery.trim().toLowerCase()
    return tasks.filter((task) => {
      const tabMatch = tab === "todas" || task.type === tab
      const priorityMatch = !priority || task.priority === priority
      const queryMatch = !q || task.title.toLowerCase().includes(q)
      const dueTrim = task.due?.trim() ?? ""
      const dueYmd = dueTrim.length >= 10 ? dueTrim.slice(0, 10) : ""
      /** Columnas: mes natural actual; las tareas sin fecha siguen visibles (backlog). */
      const dateOkColumns =
        !dueYmd || dueYmd.length < 10 ? true : dueYmd.slice(0, 7) === currentYm
      const dateOk =
        view === "columns"
          ? dateOkColumns
          : showPastAgenda || !dueTrim || dueTrim.length < 10 || dueYmd >= todayYmd
      return tabMatch && priorityMatch && queryMatch && dateOk
    })
  }, [tab, priority, deferredQuery, tasks, showPastAgenda, view])

  const googleByDay = useMemo(
    () => buildGoogleByDayIndex(googleCalendar, googleTasksFeed),
    [googleCalendar.connected, googleCalendar.events, googleTasksFeed.connected, googleTasksFeed.tasks]
  )

  const googleByDayForViews = useMemo(() => {
    if (showPastAgenda) return googleByDay
    const todayYmd = agendaTodayYmd()
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
    if (key === "compartida") {
      return tasks.filter((task) => task.type === "compartida").length
    }
    return tasks.filter((task) => task.type === key).length
  }

  const grouped = useMemo(() => ({
    recibida: filtered.filter((task) => task.type === "recibida"),
    asignada: filtered.filter((task) => task.type === "asignada"),
    compartida: filtered.filter((task) => task.type === "compartida"),
    personal: filtered.filter((task) => task.type === "personal"),
  }), [filtered])

  const weekUndated = useMemo(
    () =>
      filtered.filter((t) => {
        const d = t.due?.trim() ?? ""
        return d.length < 10
      }),
    [filtered],
  )

  const { weekDays, weekMap } = useMemo(() => {
    const fullWeek = getWeekDays(new Date())
    const days = weekScope === "work" ? fullWeek.slice(0, 5) : fullWeek
    const map: Record<string, typeof tasks> = {}
    days.forEach((day) => {
      map[formatDateKey(day)] = []
    })
    filtered.forEach((task) => {
      const dk = task.due?.trim() ?? ""
      if (dk.length < 10) return
      const key = dk.slice(0, 10)
      const bucket = map[key]
      if (bucket) bucket.push(task)
    })
    return { weekDays: days, weekMap: map }
  }, [filtered, weekScope])

  const totalWeeklyTasks =
    weekDays.reduce((acc, day) => acc + (weekMap[formatDateKey(day)]?.length ?? 0), 0) + weekUndated.length
  const totalWeeklyMinutes =
    weekDays.reduce(
      (acc, day) => acc + (weekMap[formatDateKey(day)]?.reduce((sum, t) => sum + t.duration, 0) ?? 0),
      0,
    ) + weekUndated.reduce((sum, t) => sum + t.duration, 0)
  const totalWeeklyCompleted =
    weekDays.reduce(
      (acc, day) => acc + (weekMap[formatDateKey(day)]?.filter((t) => t.completed).length ?? 0),
      0,
    ) + weekUndated.filter((t) => t.completed).length
  const totalWeeklyPending = totalWeeklyTasks - totalWeeklyCompleted

  const monthGrid = useMemo(() => buildMonthGridFromYm(monthViewYm), [monthViewYm])
  const monthLabel = useMemo(() => {
    const trimmed = monthViewYm.trim().slice(0, 7)
    if (!/^\d{4}-\d{2}$/.test(trimmed)) return ""
    const [yy, mm] = trimmed.split("-").map(Number)
    const civilNoon = new Date(Date.UTC(yy, mm - 1, 1, 12, 0, 0))
    const raw = new Intl.DateTimeFormat("es-CO", {
      timeZone: getAgendaDisplayTimeZone(),
      month: "long",
      year: "numeric",
    }).format(civilNoon)
    return raw.charAt(0).toUpperCase() + raw.slice(1)
  }, [monthViewYm])
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
    const shared = form.householdShared
    const mid = shared ? "" : form.assigneeMemberId.trim()
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
        householdShared: shared,
      })
      setFormOpen(false)
      setForm({
        title: "",
        assigneeMemberId: "",
        householdShared: false,
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

  const onPatchOrvitaTask = useCallback(
    (
      taskId: string,
      patch: Partial<{
        dueDate: string | null
        assigneeId: string | null
        assigneeName: string | null
        priority: AgendaTaskPriority
      }>,
    ) => updateTask(taskId, patch),
    [updateTask],
  )

  const onGoogleReminderToggleComplete = useCallback(
    async (id: string, completed: boolean) => {
      const result = await googleTasksFeed.patchTask(id, {
        status: completed ? "completed" : "needsAction",
      })
      if (!result) {
        throw new Error(googleTasksFeed.error || "No se pudo actualizar el recordatorio")
      }
    },
    [googleTasksFeed],
  )

  const onGoogleReminderPatch = useCallback(
    async (
      id: string,
      patch: {
        due?: string | null
        title?: string
        status?: string
        localAssigneeUserId?: string | null
        localPriority?: GoogleTaskLocalPriority | null
      },
    ) => {
      const result = await googleTasksFeed.patchTask(id, patch)
      if (!result) {
        throw new Error(googleTasksFeed.error || "No se pudo guardar el recordatorio")
      }
    },
    [googleTasksFeed],
  )

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
      <TaskCardIterationProvider>
      <section
        aria-label="Agenda unificada"
        className="overflow-hidden rounded-[var(--radius-card)] border border-[var(--color-border)] shadow-card"
        style={{ borderWidth: "0.5px", background: "var(--agenda-shell-bg)" }}
      >
        <div className="border-b border-[var(--color-border)]" style={{ background: "var(--agenda-shell-bg)" }}>
          <header
            className="px-3 pb-2 pt-2.5 sm:px-4 sm:pb-2.5 sm:pt-3 lg:px-5 lg:pb-2 lg:pt-3"
          >
            <div className="min-w-0">
              <h1 className="m-0 break-words text-[1.25rem] font-medium leading-tight tracking-tight text-[var(--color-text-primary)] sm:text-[24px] lg:text-[1.35rem] lg:font-semibold">
                {agendaTitle}
              </h1>
              <p className="m-0 mt-0.5 max-w-2xl text-[10px] leading-snug text-[var(--color-text-secondary)] sm:mt-1 sm:text-[12px] lg:mt-0.5 lg:max-w-3xl lg:text-[11px] lg:leading-snug">
                {agendaTagline}
              </p>
            </div>
          </header>

          <div
            className="sticky z-10 border-t border-[color-mix(in_srgb,var(--color-border)_65%,transparent)] px-3 py-1.5 sm:px-4 sm:py-2 lg:px-5 lg:py-1.5"
            style={{ top: "max(4rem, calc(env(safe-area-inset-top, 0px) + 3.25rem))", background: "var(--agenda-shell-bg)" }}
          >
            <div className="flex flex-col gap-1 max-sm:gap-1 sm:gap-1.5 lg:gap-1">
              <div
                className="rounded-lg border border-[var(--color-border)] px-2 py-1 sm:px-2.5 sm:py-2 lg:px-3 lg:py-1.5 max-sm:shadow-none"
                style={agendaPanelSurfaceStyle}
                role="region"
                aria-label="Buscar, sincronizar Google y filtros"
              >
                <div className="grid w-full min-w-0 grid-cols-1 gap-1.5 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-start sm:gap-x-3 sm:gap-y-1.5 lg:gap-x-4 lg:gap-y-1">
                  <div className="flex min-w-0 w-full flex-col gap-1.5 sm:col-start-1 sm:row-start-1 sm:flex-row sm:items-center sm:gap-2 lg:gap-1.5">
                    <div className="flex min-h-[34px] min-w-0 flex-1 items-center gap-1.5 rounded-md border border-[var(--color-border)] bg-[var(--color-surface-alt)] px-2 py-1 sm:min-w-[10rem] sm:max-w-md lg:max-w-2xl lg:min-h-[32px]">
                      <Search size={13} className="shrink-0 text-[var(--color-text-secondary)] lg:h-[13px] lg:w-[13px]" aria-hidden />
                      <input
                        placeholder="Buscar…"
                        value={query}
                        onChange={(event) => setQuery(event.target.value)}
                        className="min-w-0 flex-1 border-0 bg-transparent text-[12px] text-[var(--color-text-primary)] outline-none placeholder:text-[var(--color-text-secondary)] lg:text-[13px]"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => setFormOpen(true)}
                      aria-label="Nueva tarea"
                      className="inline-flex min-h-[34px] shrink-0 items-center justify-center gap-1 rounded-md border border-[color-mix(in_srgb,var(--color-border)_70%,transparent)] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-white sm:min-h-[34px] sm:px-3 sm:text-[11px] sm:tracking-[0.1em] lg:min-h-[32px] lg:px-2.5 lg:py-1 lg:text-[10px]"
                      style={{ background: "var(--agenda-assigned)" }}
                      title="Crear tarea en Órvita"
                    >
                      <Plus size={14} className="shrink-0 lg:h-[15px] lg:w-[15px]" strokeWidth={2.25} aria-hidden />
                      <span className="max-sm:sr-only">Nueva tarea</span>
                      <span className="sm:hidden">Tarea</span>
                    </button>
                  </div>
                  <div className="hidden min-w-0 sm:col-start-2 sm:row-start-1 sm:flex sm:max-w-[min(30rem,40vw)] sm:flex-wrap sm:items-center sm:justify-end sm:gap-x-1 sm:gap-y-0.5 lg:max-w-none lg:shrink-0">
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
                <div className="mt-1 border-t border-[var(--color-border)] pt-1 sm:mt-1.5 sm:pt-1.5 lg:mt-1.5 lg:pt-1.5">
                  <div className="sm:hidden">
                    <button
                      type="button"
                      onClick={() => setMobileFiltersOpen((v) => !v)}
                      className="flex w-full items-center justify-between rounded-md px-1 py-1 text-left"
                      aria-expanded={mobileFiltersOpen}
                      aria-controls="agenda-mobile-filters"
                    >
                      <span className="inline-flex items-center gap-1 text-[9px] font-semibold uppercase tracking-[0.1em] text-[var(--color-text-secondary)]">
                        <SlidersHorizontal className="h-3 w-3" aria-hidden />
                        Filtros
                      </span>
                      <span className="inline-flex items-center gap-1 text-[9px] text-[var(--color-text-secondary)]">
                        {mobileFilterCount > 0 ? `${mobileFilterCount} activos` : "Sin filtros"}
                        {mobileFiltersOpen ? <ChevronUp className="h-3 w-3" aria-hidden /> : <ChevronDown className="h-3 w-3" aria-hidden />}
                      </span>
                    </button>
                  </div>
                  <div
                    id="agenda-mobile-filters"
                    className={`${mobileFiltersOpen ? "mt-1.5 flex flex-col gap-1" : "hidden"} sm:mt-0 sm:flex sm:flex-col sm:gap-y-1 lg:flex-row lg:flex-wrap lg:items-center lg:gap-x-1.5 lg:gap-y-1`}
                  >
                    <div className="flex w-full min-w-0 flex-wrap items-center gap-x-1 gap-y-0.5 sm:hidden">
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
                    <div className="hidden min-w-0 flex-wrap items-center gap-x-1.5 gap-y-0.5 sm:flex lg:shrink-0">
                      <AgendaColorLegend inline omitHeading sourcesOnly dense />
                    </div>
                    <span className="hidden h-3 w-px shrink-0 self-stretch bg-[var(--color-border)] md:block lg:self-center lg:h-4" aria-hidden />
                    <div className="flex min-w-0 flex-1 flex-nowrap gap-0.5 overflow-x-auto pb-0.5 [-ms-overflow-style:none] [scrollbar-width:none] sm:flex-wrap sm:overflow-visible sm:pb-0 lg:min-w-[12rem] lg:flex-1 [&::-webkit-scrollbar]:hidden">
                      {tabs.map((item) => (
                        <button
                          key={item.key}
                          type="button"
                          onClick={() => setTab(item.key)}
                          className="inline-flex min-h-7 shrink-0 items-center gap-1 rounded-full border border-[var(--color-border)] px-2 py-0.5 text-[8.5px] sm:min-h-0 sm:px-2 sm:py-px sm:text-[9px] lg:min-h-7 lg:px-2 lg:py-px lg:text-[9px]"
                          style={{
                            background: tab === item.key ? "var(--color-surface-alt)" : "transparent",
                            color: tab === item.key ? "var(--color-text-primary)" : "var(--color-text-secondary)",
                            boxShadow:
                              tab === item.key ? "inset 0 0 0 1px color-mix(in srgb, var(--color-border) 80%, transparent)" : undefined,
                          }}
                        >
                          {item.label}
                          <span className="inline-block min-w-[2.25ch] text-right tabular-nums text-[9px] text-[var(--color-text-secondary)] lg:text-[9px]">
                            {countByTab(item.key)}
                          </span>
                        </button>
                      ))}
                    </div>
                    <span className="hidden h-3 w-px shrink-0 self-stretch bg-[var(--color-border)] lg:block lg:self-center lg:h-4" aria-hidden />
                    <div className="flex w-full min-w-0 flex-nowrap items-center gap-0.5 overflow-x-auto pb-0.5 [-ms-overflow-style:none] [scrollbar-width:none] sm:flex-wrap sm:overflow-visible sm:pb-0 lg:ml-auto lg:w-auto lg:flex-none lg:justify-end [&::-webkit-scrollbar]:hidden">
                      <button
                        type="button"
                        onClick={() => setShowPastAgenda((v) => !v)}
                        className="min-h-7 shrink-0 rounded-full border border-[var(--color-border)] px-2 py-0.5 text-[8px] font-medium uppercase tracking-[0.06em] sm:min-h-0 sm:px-2 sm:py-px sm:text-[8.5px] lg:min-h-7 lg:px-2 lg:py-px lg:text-[8.5px]"
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
                          className="min-h-7 shrink-0 rounded-full px-2 py-0.5 text-[8px] uppercase tracking-[0.06em] sm:min-h-0 sm:px-2 sm:py-px sm:text-[8.5px] lg:min-h-7 lg:px-2 lg:py-px lg:text-[8.5px]"
                          style={priorityFilterControlStyle(item, priority === item)}
                        >
                          {formatPriorityTitle(item)}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <div className="rounded-lg border border-[var(--color-border)] p-0.5 sm:p-1.5 lg:p-1" style={agendaPanelSurfaceStyle}>
                <div className="flex min-w-0 flex-row gap-1 sm:hidden" role="tablist" aria-label="Vista de agenda">
                  {viewOptions.map((item) => {
                    const Icon = item.icon
                    const active = view === item.key
                    return (
                      <button
                        key={`mobile-${item.key}`}
                        type="button"
                        role="tab"
                        aria-selected={active}
                        title={item.label}
                        aria-label={`${item.label}: ${item.description}`}
                        onClick={() => setView(item.key)}
                        className="flex min-h-8 min-w-0 flex-1 items-center justify-center rounded-md px-1.5 py-1 transition-[background-color,border-color] duration-150"
                        style={{
                          border: active ? `1.5px solid ${item.color}` : "1px solid var(--color-border)",
                          background: active
                            ? `color-mix(in srgb, ${item.color} 12%, var(--color-surface-alt))`
                            : "var(--color-surface-alt)",
                        }}
                      >
                        <Icon size={14} strokeWidth={2} className="shrink-0" style={{ color: item.color }} aria-hidden />
                      </button>
                    )
                  })}
                </div>
                <div className="hidden sm:flex sm:flex-row sm:items-stretch sm:gap-2 lg:gap-2">
                  <div
                    className="flex min-w-0 flex-1 flex-row flex-wrap gap-0.5 sm:gap-1 lg:gap-1"
                    role="tablist"
                    aria-label="Vista de agenda"
                  >
                    {viewOptions.map((item) => {
                      const Icon = item.icon
                      const active = view === item.key
                      return (
                        <button
                          key={item.key}
                          type="button"
                          role="tab"
                          aria-selected={active}
                          title={item.description}
                          aria-label={`${item.label}: ${item.description}`}
                          onClick={() => setView(item.key)}
                          className="flex min-h-9 min-w-0 flex-1 basis-[calc(50%-2px)] flex-row items-center justify-center gap-1.5 rounded-md px-2 py-1 text-center transition-[background-color,border-color] duration-150 sm:min-h-8 sm:flex-1 sm:basis-0 sm:gap-1.5 sm:px-2.5 sm:py-1.5 lg:min-h-8 lg:gap-1.5 lg:px-2.5 lg:py-1.5"
                          style={{
                            border: active ? `1.5px solid ${item.color}` : "1px solid var(--color-border)",
                            background: active
                              ? `color-mix(in srgb, ${item.color} 12%, var(--color-surface-alt))`
                              : "var(--color-surface-alt)",
                          }}
                        >
                          <Icon size={14} strokeWidth={2} className="shrink-0 lg:h-[13px] lg:w-[13px]" style={{ color: item.color }} aria-hidden />
                          <span
                            className="m-0 truncate text-[10px] font-semibold leading-none sm:text-[11px] lg:text-[10px]"
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
          </div>
        </div>

        <Suspense fallback={null}>
          <AgendaTrainingSuggestPanel
            events={googleCalendar.events}
            calendarConnected={googleCalendar.connected}
            calendarLoading={googleCalendar.loading}
          />
        </Suspense>

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
          className="unified-agenda-container flex min-w-0 flex-col gap-2 px-3 py-3 sm:gap-3 sm:px-4 sm:py-4 md:gap-4 lg:gap-3 lg:px-5 lg:py-4"
          style={{ background: "var(--agenda-shell-bg)" }}
        >
          <div
            className="flex min-h-0 min-w-0 flex-1 flex-col gap-4 md:gap-6 lg:gap-4"
            aria-label="Agenda: vista activa con Órvita y Google"
          >
            <div className="flex min-h-0 min-w-0 flex-1 flex-col">
              {view === "columns" && (
                <AgendaSharedKanban
                  grouped={grouped}
                  pendingInvites={pendingUi}
                  calendarFeed={googleCalendar}
                  googleTasksFeed={googleTasksFeed}
                  hideBeforeToday={!showPastAgenda}
                  householdMembers={householdMembers}
                  viewerUserId={viewerUserId}
                  onOpenAgendaEdit={(t) => setAgendaEditTarget(t)}
                  isCalendarUiDone={isCalendarUiDone}
                  toggleCalendarUiDone={toggleCalendarUiDone}
                  onGoogleReminderToggleComplete={
                    googleTasksFeed.connected ? onGoogleReminderToggleComplete : undefined
                  }
                  onPatchOrvitaTask={onPatchOrvitaTask}
                  onGoogleReminderPatch={googleTasksFeed.connected ? onGoogleReminderPatch : undefined}
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
                  householdMembers={householdMembers}
                  viewerUserId={viewerUserId}
                  onOpenAgendaEdit={(t) => setAgendaEditTarget(t)}
                  isCalendarUiDone={isCalendarUiDone}
                  toggleCalendarUiDone={toggleCalendarUiDone}
                  onGoogleReminderToggleComplete={
                    googleTasksFeed.connected ? onGoogleReminderToggleComplete : undefined
                  }
                  onPatchOrvitaTask={onPatchOrvitaTask}
                  onGoogleReminderPatch={googleTasksFeed.connected ? onGoogleReminderPatch : undefined}
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
                  weekUndated={weekUndated}
                  weekScope={weekScope}
                  onWeekScopeChange={setWeekScope}
                  totalWeeklyTasks={totalWeeklyTasks}
                  totalWeeklyCompleted={totalWeeklyCompleted}
                  totalWeeklyPending={totalWeeklyPending}
                  totalWeeklyMinutes={totalWeeklyMinutes}
                  formatDateKey={formatDateKey}
                  formatDayLabel={formatDayLabel}
                  googleByDay={googleByDayForViews}
                  householdMembers={householdMembers}
                  viewerUserId={viewerUserId}
                  onOpenAgendaEdit={(t) => setAgendaEditTarget(t)}
                  isCalendarUiDone={isCalendarUiDone}
                  toggleCalendarUiDone={toggleCalendarUiDone}
                  onGoogleReminderToggleComplete={
                    googleTasksFeed.connected ? onGoogleReminderToggleComplete : undefined
                  }
                  onGoogleReminderPatch={googleTasksFeed.connected ? onGoogleReminderPatch : undefined}
                />
              )}
              {view === "month" && (
                <AgendaSharedMonth
                  monthGrid={monthGrid}
                  monthLabel={monthLabel}
                  monthSummary={monthSummary}
                  tasks={filtered}
                  undatedTasks={weekUndated}
                  selectedDay={selectedDay}
                  onSelectDay={setSelectedDay}
                  dayDetails={dayDetails}
                  formatDateKey={formatDateKey}
                  googleByDay={googleByDayForViews}
                  householdMembers={householdMembers}
                  viewerUserId={viewerUserId}
                  onOpenAgendaEdit={(t) => setAgendaEditTarget(t)}
                  isCalendarUiDone={isCalendarUiDone}
                  toggleCalendarUiDone={toggleCalendarUiDone}
                  onGoogleReminderToggleComplete={
                    googleTasksFeed.connected ? onGoogleReminderToggleComplete : undefined
                  }
                  onGoogleReminderPatch={googleTasksFeed.connected ? onGoogleReminderPatch : undefined}
                  onDeleteGoogleTask={googleTasksFeed.connected ? onDeleteGoogleTask : undefined}
                  onDeleteCalendarEvent={googleCalendar.connected ? onDeleteCalendarEvent : undefined}
                  onPrevMonth={() => setMonthViewYm((ym) => addCalendarMonthsYm(ym, -1))}
                  onNextMonth={() => setMonthViewYm((ym) => addCalendarMonthsYm(ym, 1))}
                  onGoThisMonth={() => {
                    setMonthViewYm(agendaTodayYmd().slice(0, 7))
                  }}
                />
              )}
            </div>
          </div>
        </div>
      </section>
      </TaskCardIterationProvider>

      <AgendaTaskEditModal
        target={agendaEditTarget}
        onClose={() => setAgendaEditTarget(null)}
        householdMembers={householdMembers}
        onSaveOrvita={async (id, patch) => {
          await updateTask(id, patch)
        }}
        onSaveGoogleReminder={onGoogleReminderPatch}
      />

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
                    disabled={form.householdShared}
                    onChange={(event) =>
                      setForm((prev) => ({
                        ...prev,
                        assigneeMemberId: event.target.value,
                        householdShared: event.target.value ? false : prev.householdShared,
                      }))
                    }
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
              <label className="flex cursor-pointer items-start gap-2.5 rounded-lg border border-[color-mix(in_srgb,var(--agenda-shared)_35%,var(--color-border))] bg-[color-mix(in_srgb,var(--agenda-shared)_10%,var(--color-surface))] px-3 py-2.5 text-[12px] text-[var(--color-text-primary)]">
                <input
                  type="checkbox"
                  className="mt-0.5 h-4 w-4 shrink-0 accent-[var(--agenda-shared)]"
                  checked={form.householdShared}
                  onChange={(event) =>
                    setForm((prev) => ({
                      ...prev,
                      householdShared: event.target.checked,
                      assigneeMemberId: event.target.checked ? "" : prev.assigneeMemberId,
                    }))
                  }
                />
                <span className="min-w-0 leading-snug">
                  <span className="font-semibold">Compartir con el hogar</span>
                  <span className="mt-0.5 block text-[11px] font-normal text-[var(--color-text-secondary)]">
                    Todos los miembros la ven y pueden marcar estado; solo quien la crea puede eliminarla. No se envía a
                    Google Tasks del creador. (Distinto de asignar a una persona concreta.)
                  </span>
                </span>
              </label>
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
