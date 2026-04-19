import { NextRequest, NextResponse } from "next/server"

import type { AuthedRequest } from "@/lib/api/requireUser"
import { requireUser } from "@/lib/api/requireUser"
import { isAppMockMode } from "@/lib/checkins/flags"
import { buildOperationalContext } from "@/lib/operational/context"
import {
  mapCheckin,
  mapOperationalHabit,
  mapOperationalTask,
  type CheckinRow,
  type OperationalHabitRow,
  type OperationalTaskRow,
} from "@/lib/operational/mappers"
import { siteOrigin } from "@/lib/site/origin"

export const runtime = "nodejs"

type MobileWidgetSummary = {
  generatedAt: string
  webBaseUrl: string
  operationalOpenTasks: number
  habitsDone: number
  habitsTotal: number
  nextActionTitle: string | null
  deepLinks: {
    home: string
    checkin: { manana: string; dia: string; noche: string }
  }
  /**
   * Solo en respuesta demo (sin Bearer válido + env mock). Omitir en datos reales para no romper clientes viejos.
   */
  demo?: boolean
}

const DEEP_LINKS = {
  home: "/",
  checkin: {
    manana: "/checkin#checkin-manana",
    dia: "/checkin#checkin-dia",
    noche: "/checkin#checkin-noche",
  },
} as const

/** Solo sin sesión en modo demo: la extensión WidgetKit no envía Bearer. */
function mockWidgetPayload(webBaseUrl: string): MobileWidgetSummary {
  return {
    generatedAt: new Date().toISOString(),
    webBaseUrl,
    operationalOpenTasks: 2,
    habitsDone: 1,
    habitsTotal: 3,
    nextActionTitle: "Completar propuesta para cliente",
    deepLinks: { ...DEEP_LINKS },
    demo: true,
  }
}

async function widgetPayloadForUser(auth: AuthedRequest, webBaseUrl: string): Promise<MobileWidgetSummary> {
  const { supabase, userId } = auth

  const [{ data: tasks }, { data: habits }, { data: latestCheckin }] = await Promise.all([
    supabase
      .from("operational_tasks")
      .select("id,title,completed,domain,created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(120),
    supabase
      .from("operational_habits")
      .select("id,name,completed,domain,created_at,metadata")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(80),
    supabase
      .from("checkins")
      .select("id,score_global,score_fisico,score_salud,score_profesional,created_at,updated_at")
      .eq("user_id", userId)
      .order("updated_at", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ])

  const mappedTasks = (tasks ?? []).map((row) => mapOperationalTask(row as OperationalTaskRow))
  const mappedHabits = (habits ?? []).map((row) => mapOperationalHabit(row as OperationalHabitRow))

  const context = buildOperationalContext({
    tasks: mappedTasks,
    habits: mappedHabits,
    latestCheckin: latestCheckin ? mapCheckin(latestCheckin as CheckinRow) : null,
  })

  const operationalOpenTasks = mappedTasks.filter((t) => !t.completed).length
  const habitsTotal = mappedHabits.length
  const habitsDone = mappedHabits.filter((h) => h.completed).length

  return {
    generatedAt: new Date().toISOString(),
    webBaseUrl,
    operationalOpenTasks,
    habitsDone,
    habitsTotal,
    nextActionTitle: context.next_action?.trim() ? context.next_action.trim() : null,
    deepLinks: { ...DEEP_LINKS },
  }
}

export async function GET(req: NextRequest) {
  try {
    const webBaseUrl = siteOrigin()
    const auth = await requireUser(req)

    if (auth instanceof NextResponse) {
      if (isAppMockMode()) {
        console.warn(
          "[widget-summary] Sin Bearer válido: respuesta demo (revisar token en App Group / bridge iOS).",
        )
        return NextResponse.json({ success: true, data: mockWidgetPayload(webBaseUrl) })
      }
      return auth
    }

    const payload = await widgetPayloadForUser(auth, webBaseUrl)
    return NextResponse.json({ success: true, data: payload })
  } catch (error: unknown) {
    const detail = error instanceof Error ? error.message : "Error desconocido"
    console.error("MOBILE_WIDGET_SUMMARY ERROR:", detail)
    return NextResponse.json({ success: false, error: "Error cargando resumen" }, { status: 500 })
  }
}
