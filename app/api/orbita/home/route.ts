import { NextRequest, NextResponse } from "next/server"

import { requireUser } from "@/lib/api/requireUser"
import { isAppMockMode } from "@/lib/checkins/flags"
import type { FlowColor, OrbitaHomeModel, PredictivePoint } from "@/app/home/_lib/orbita-home-types"
import { getOrbitaHomeMock } from "@/app/home/_lib/orbita-home-mock"

export const runtime = "nodejs"

function clamp01(n: number) {
  return Math.max(0, Math.min(1, n))
}

function flowColor(score: number): FlowColor {
  if (score >= 75) return "green"
  if (score >= 55) return "yellow"
  return "red"
}

function seedFromDateBogota(now: Date) {
  const str = now.toLocaleDateString("en-CA", { timeZone: "America/Bogota" }) // YYYY-MM-DD
  let h = 2166136261
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

function mulberry32(seed: number) {
  return function rand() {
    let t = (seed += 0x6d2b79f5)
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function genPredictive30d(now: Date): PredictivePoint[] {
  const baseStr = now.toLocaleDateString("en-CA", { timeZone: "America/Bogota" })
  const base = new Date(`${baseStr}T00:00:00-05:00`)
  const points: PredictivePoint[] = []
  const rand = mulberry32(seedFromDateBogota(now))

  let timeLoad = 52 + Math.round(rand() * 20)
  let energy = 58 + Math.round(rand() * 18)
  let moneyPressure = 48 + Math.round(rand() * 26)

  for (let i = 0; i < 30; i++) {
    const d = new Date(base)
    d.setDate(base.getDate() + i)

    const weekday = d.toLocaleDateString("es-CO", { weekday: "short", timeZone: "America/Bogota" })
    const day = d.toLocaleDateString("es-CO", { day: "2-digit", month: "short", timeZone: "America/Bogota" })

    const weekBump = /lun|jue/i.test(weekday) ? 6 : /mar|mié|mie/i.test(weekday) ? 2 : -1
    const noise = (Math.sin(i / 3) + Math.cos(i / 5)) * 1.6 + (rand() - 0.5) * 2.2

    timeLoad = Math.max(35, Math.min(92, timeLoad + weekBump * 0.35 + noise))
    moneyPressure = Math.max(35, Math.min(92, moneyPressure + 0.35 + (i % 7 === 0 ? 1.5 : 0) + noise * 0.25))
    energy = Math.max(28, Math.min(90, energy - (timeLoad - 55) * 0.06 - (moneyPressure - 55) * 0.03 + noise * 0.2))

    const flowScore = Math.round(
      100 *
        clamp01(
          0.76 -
            (timeLoad - 50) / 170 -
            (moneyPressure - 50) / 190 +
            (energy - 50) / 240,
        ),
    )

    points.push({
      day: `${day}`,
      timeLoad: Math.round(timeLoad),
      energy: Math.round(energy),
      moneyPressure: Math.round(moneyPressure),
      flowScore,
    })
  }

  return points
}

function firstNameFromMetadata(raw: unknown) {
  const name = typeof raw === "string" ? raw.trim() : ""
  if (!name) return null
  const first = name.split(/\s+/)[0]
  return first || null
}

type AlertStateRow = {
  alert_id: string
  status: "active" | "resolved" | "dismissed"
}

type SmartActionStateRow = {
  smart_action_id: string
  status: "active" | "done" | "scheduled" | "ignored"
}

export async function GET(req: NextRequest) {
  try {
    const now = new Date()

    if (isAppMockMode()) {
      const mock = getOrbitaHomeMock()
      const points30d = genPredictive30d(now)
      const score = Math.max(40, Math.min(92, points30d[0]?.flowScore ?? mock.flow.score))
      const model: OrbitaHomeModel = {
        ...mock,
        flow: {
          ...mock.flow,
          score,
          color: flowColor(score),
          microcopy:
            score >= 75
              ? "Buen pulso. Mantén cierres y protege energía."
              : score >= 55
                ? "Estable, pero con presión latente. Reduce fricción."
                : "Zona roja. Compra claridad: recorta, cierra, recupera.",
        },
        predictive: {
          ...mock.predictive,
          points30d,
        },
      }
      return NextResponse.json({ success: true, source: "mock", data: model })
    }

    const auth = await requireUser(req)
    if (auth instanceof NextResponse) return auth
    const { supabase, userId } = auth

    const [{ data: userRes }, checkinRes, tasksRes, habitsRes, alertStatesRes, smartStatesRes] = await Promise.all([
      supabase.auth.getUser(),
      supabase
        .from("checkins")
        .select("score_global,created_at")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase
        .from("operational_tasks")
        .select("id,completed,domain,created_at")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(120),
      supabase
        .from("operational_habits")
        .select("id,completed,domain,created_at")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(80),
      supabase
        .from("orbita_home_alert_states")
        .select("alert_id,status")
        .eq("user_id", userId),
      supabase
        .from("orbita_home_smart_action_states")
        .select("smart_action_id,status")
        .eq("user_id", userId),
    ])

    const rawName =
      userRes?.user?.user_metadata?.full_name ??
      userRes?.user?.user_metadata?.name ??
      userRes?.user?.email ??
      null
    const firstName = firstNameFromMetadata(rawName) ?? "Usuario"

    const latestCheckinScore = Number((checkinRes.data as { score_global?: unknown } | null)?.score_global ?? 0)
    const completedTasks = (tasksRes.data ?? []).filter((t) => Boolean((t as { completed?: boolean }).completed)).length
    const openTasks = (tasksRes.data ?? []).length - completedTasks
    const completedHabits = (habitsRes.data ?? []).filter((h) => Boolean((h as { completed?: boolean }).completed))
      .length

    const points30d = genPredictive30d(now)
    const baseScore = points30d[0]?.flowScore ?? 62
    const score = Math.max(
      25,
      Math.min(
        96,
        Math.round(
          baseScore +
            (Number.isFinite(latestCheckinScore) ? (latestCheckinScore - 60) * 0.25 : 0) -
            Math.min(18, openTasks) * 0.65 +
            Math.min(10, completedHabits) * 0.25,
        ),
      ),
    )

    const hiddenAlerts = new Set(
      ((alertStatesRes.data ?? []) as AlertStateRow[])
        .filter((r) => r.status === "resolved" || r.status === "dismissed")
        .map((r) => r.alert_id),
    )
    const hiddenSmartActions = new Set(
      ((smartStatesRes.data ?? []) as SmartActionStateRow[])
        .filter((r) => r.status !== "active")
        .map((r) => r.smart_action_id),
    )

    const model: OrbitaHomeModel = {
      user: {
        firstName,
        city: "Bogotá",
        tz: "America/Bogota",
      },
      flow: {
        score,
        color: flowColor(score),
        label: "Flujo Operativo",
        microcopy:
          openTasks > 10
            ? "Mucho abierto y poco cierre. Reduce WIP hoy."
            : score >= 75
              ? "Buen pulso. Mantén cierres y protege energía."
              : "Estable, pero con presión latente. Compra claridad.",
      },
      alerts: [
        {
          id: "a-wip",
          title: openTasks > 12 ? `Demasiado abierto: ${openTasks} tareas activas` : "Evita fragmentación de agenda",
          description:
            openTasks > 12
              ? "Cuando el WIP sube, la energía cae y la ejecución se vuelve reactiva. Elimina 2 frentes hoy."
              : "Protege 1 bloque profundo y cierra lo crítico para liberar carga cognitiva.",
          impact: openTasks > 12 ? "alto" : "medio",
          oneClickActionLabel: openTasks > 12 ? "Recortar 2 gastos hoy" : "Defender 1 bloque profundo",
        },
        {
          id: "a-energy",
          title: "Energía: protege recuperación",
          description:
            "Tu flujo depende más de tu recuperación que de tu disciplina. Bloquea un espacio corto y constante.",
          impact: "alto",
          oneClickActionLabel: "Bloquear 90m recuperación",
        },
        {
          id: "a-close",
          title: completedTasks > 0 ? `Cierres hoy: ${completedTasks}` : "Cierre pendiente: define el siguiente paso",
          description:
            "Cada día sin cierre multiplica fricción. Decide: cerrar, renegociar o eliminar compromiso.",
          impact: "medio",
          oneClickActionLabel: "Redactar cierre (20m)",
        },
      ].filter((a) => !hiddenAlerts.has(a.id)),
      capital: {
        time: {
          availableHours: 9.0,
          consumedHours: Math.max(2.5, Math.min(8.8, 5.8 + Math.min(10, openTasks) * 0.12)),
          strategicFocusPct: Math.max(10, Math.min(45, 30 - Math.min(14, openTasks) * 1.1)),
        },
        energy: {
          currentLevelPct: Math.max(35, Math.min(92, 62 + (score - 65) * 0.25)),
          trend7d: [68, 66, 63, 61, 60, 62, Math.max(35, Math.min(92, 62 + (score - 65) * 0.25))],
          burnoutRiskPct: Math.max(5, Math.min(95, 55 + Math.min(18, openTasks) * 1.1 - Math.max(0, score - 70) * 0.4)),
        },
        money: {
          netMonthlyCOP: -1450000,
          runwayDays: Math.max(7, Math.min(90, 30 - Math.min(18, openTasks))),
          financialPressurePct: Math.max(10, Math.min(95, 55 + Math.min(18, openTasks) * 1.2)),
        },
      },
      predictive: {
        points30d,
        insights: [
          {
            id: `i-pressure-${seedFromDateBogota(now)}`,
            title: "Señal dominante de presión",
            body:
              openTasks > 10
                ? "El driver no es tiempo: es **trabajo sin cierre**. Baja WIP para recuperar energía y decisión."
                : "La presión viene de fricción pequeña acumulada. Cierra 1 cosa y elimina 1 micro-pendiente.",
            severity: "presion",
          },
          {
            id: `i-impact-${seedFromDateBogota(now)}`,
            title: "Movimiento de alto impacto hoy",
            body:
              "Protege **1 bloque profundo** y ejecuta un cierre visible. No optimices: compra claridad.",
            severity: "oportunidad",
          },
          {
            id: `i-risk-${seedFromDateBogota(now)}`,
            title: "Riesgo latente",
            body:
              "Si mantienes carga alta sin recuperación, el rendimiento cae de forma no lineal. Mitiga con recuperación + límites de agenda.",
            severity: "riesgo",
          },
        ],
      },
      smartActions: [
        {
          id: "s-focus",
          title: "Blindar 1 bloque profundo (90m) en ventana de energía alta",
          roi: "ROI estratégico: +alto (dirección 90D)",
          timeRequiredMin: 5,
          primaryAction: "Agendar",
        },
        {
          id: "s-close",
          title: "Cerrar 1 frente abierto (definir siguiente paso en 20m)",
          roi: "ROI estratégico: alto (reduce fricción + libera mente)",
          timeRequiredMin: 20,
          primaryAction: "Ejecutar",
        },
        {
          id: "s-trim",
          title: "Recortar fricción: elimina 2 pendientes de baja palanca",
          roi: "ROI estratégico: medio (baja carga y ruido)",
          timeRequiredMin: 10,
          primaryAction: "Ignorar",
        },
      ].filter((a) => !hiddenSmartActions.has(a.id)),
      widgets: {
        decisions: [
          { id: "d-1", title: "Elegir 1 cierre visible hoy", deadline: "Hoy 17:00", pressure: "alta" },
          { id: "d-2", title: "Definir límite de reuniones (1 regla)", deadline: "Mañana 12:00", pressure: "media" },
          { id: "d-3", title: "Elegir 1 métrica de progreso (90D)", deadline: "Sáb 09:00", pressure: "media" },
        ],
        agendaToday: [
          { id: "b-1", time: "08:30–10:00", title: "Trabajo profundo: cierre #1", energyWindow: "alta" },
          { id: "b-2", time: "10:30–11:15", title: "Sincronización corta", energyWindow: "media" },
          { id: "b-3", time: "15:00–15:30", title: "Cierre administrativo", energyWindow: "media" },
        ],
        habits: [
          {
            id: "h-1",
            name: "Sueño (consistencia)",
            week: [
              { day: "L", score: 78 },
              { day: "M", score: 71 },
              { day: "X", score: 66 },
              { day: "J", score: 62 },
              { day: "V", score: 59 },
              { day: "S", score: 64 },
              { day: "D", score: 67 },
            ],
          },
          {
            id: "h-2",
            name: "Movimiento (mínimo viable)",
            week: [
              { day: "L", score: 55 },
              { day: "M", score: 62 },
              { day: "X", score: 58 },
              { day: "J", score: 45 },
              { day: "V", score: 52 },
              { day: "S", score: 70 },
              { day: "D", score: 63 },
            ],
          },
        ],
      },
    }

    return NextResponse.json({ success: true, source: "supabase", data: model })
  } catch (error: unknown) {
    const detail = error instanceof Error ? error.message : "Error desconocido"
    console.error("ORB_HOME ERROR:", detail)
    return NextResponse.json({ success: false, error: "Error cargando inicio" }, { status: 500 })
  }
}

