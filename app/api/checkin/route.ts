import { NextRequest, NextResponse } from "next/server"
import { requireUser } from "@/lib/api/requireUser"
import {
  buildBodyMetricsFromForm,
  deriveLegacyScores,
  parseCheckinFormBody,
} from "@/lib/checkins/checkinPayload"
import {
  CHECKIN_SUPABASE_DISABLED_CODE,
  CHECKIN_SUPABASE_DISABLED_HINT,
  CHECKIN_SUPABASE_DISABLED_MESSAGE,
  isAppMockMode,
  isSupabaseEnabled,
} from "@/lib/checkins/flags"

export const runtime = "nodejs"

export async function POST(req: NextRequest) {
  try {
    const mock = isAppMockMode()
    const supabaseEnabled = isSupabaseEnabled()

    if (mock) {
      const body = await req.json().catch(() => null)
      const parsed = parseCheckinFormBody(body)
      if (!parsed.ok) {
        return NextResponse.json({ success: false, error: parsed.error, mock: true }, { status: 400 })
      }
      return NextResponse.json({
        success: true,
        mock: true,
        message:
          "Modo mock (NEXT_PUBLIC_APP_MODE=mock): respuesta simulada; no se escribió en Supabase.",
        received: { fecha: parsed.data.fecha },
        flags: {
          appMode: "mock",
          supabasePersistenceEnabled: isSupabaseEnabled(),
        },
      })
    }

    if (!supabaseEnabled) {
      return NextResponse.json(
        {
          success: false,
          code: CHECKIN_SUPABASE_DISABLED_CODE,
          error: CHECKIN_SUPABASE_DISABLED_MESSAGE,
          hint: CHECKIN_SUPABASE_DISABLED_HINT,
          flags: {
            appMode: "standard",
            supabasePersistenceEnabled: false,
          },
        },
        { status: 403 }
      )
    }

    const auth = await requireUser(req)
    if (auth instanceof NextResponse) return auth
    const { supabase, userId } = auth

    const raw = await req.json().catch(() => null)
    const parsed = parseCheckinFormBody(raw)
    if (!parsed.ok) {
      return NextResponse.json({ success: false, error: parsed.error }, { status: 400 })
    }

    const data = parsed.data
    const scores = deriveLegacyScores(data)
    const bodyMetrics = buildBodyMetricsFromForm(data)

    const resolvedSource =
      data.source ?? (data.sheet_row_id ? "sheets" : "manual")

    const { data: inserted, error } = await supabase
      .from("checkins")
      .insert({
        user_id: userId,
        score_global: scores.score_global,
        score_fisico: scores.score_fisico,
        score_salud: scores.score_salud,
        score_profesional: scores.score_profesional,
        body_metrics: bodyMetrics,
        sheet_row_id: data.sheet_row_id ?? null,
        source: resolvedSource,
        notes: null,
      })
      .select("id,created_at,body_metrics,sheet_row_id,source")
      .single()

    if (error) {
      console.error("CHECKIN POST ERROR:", error.message)
      return NextResponse.json(
        { success: false, error: "No se pudo guardar el check-in" },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data: inserted,
      flags: {
        appMode: "standard",
        supabasePersistenceEnabled: true,
      },
    })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Error desconocido"
    console.error("CHECKIN ROUTE ERROR:", msg)
    return NextResponse.json({ success: false, error: msg }, { status: 500 })
  }
}


