import { NextRequest, NextResponse } from "next/server"

import { requireUser } from "@/lib/api/requireUser"
import { isAppMockMode } from "@/lib/checkins/flags"

export const runtime = "nodejs"

type ActionKind = "alert_one_click" | "alert_ai_resolve" | "smart_action"
type SmartPrimaryAction = "Ejecutar" | "Agendar" | "Ignorar"

type ActionPayload = {
  kind?: ActionKind
  id?: string
  action?: SmartPrimaryAction
}

function isActionKind(value: unknown): value is ActionKind {
  return value === "alert_one_click" || value === "alert_ai_resolve" || value === "smart_action"
}

function isSmartAction(value: unknown): value is SmartPrimaryAction {
  return value === "Ejecutar" || value === "Agendar" || value === "Ignorar"
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => ({}))) as ActionPayload
    if (!isActionKind(body.kind) || !body.id) {
      return NextResponse.json({ success: false, error: "Payload inválido" }, { status: 400 })
    }

    if (body.kind === "smart_action" && !isSmartAction(body.action)) {
      return NextResponse.json({ success: false, error: "Acción inválida" }, { status: 400 })
    }

    if (isAppMockMode()) {
      return NextResponse.json({
        success: true,
        source: "mock",
        data: {
          id: body.id,
          kind: body.kind,
          action: body.action ?? null,
          executedAt: new Date().toISOString(),
        },
      })
    }

    const auth = await requireUser(req)
    if (auth instanceof NextResponse) return auth

    const { supabase, userId } = auth
    let persisted = false
    let warning: string | null = null

    if (body.kind === "alert_one_click" || body.kind === "alert_ai_resolve") {
      const { error: alertStateError } = await supabase
        .from("orbita_home_alert_states")
        .upsert(
          {
            user_id: userId,
            alert_id: body.id,
            status: "resolved",
            last_action: body.kind === "alert_one_click" ? "one_click" : "ai_resolve",
            updated_at: new Date().toISOString(),
          },
          { onConflict: "user_id,alert_id" },
        )
      if (!alertStateError) persisted = true
      else warning = "No se pudo persistir estado de alerta; se aplicó en UI."
    }

    if (body.kind === "smart_action" && body.action) {
      const smartStatus =
        body.action === "Ejecutar" ? "done" : body.action === "Agendar" ? "scheduled" : "ignored"
      const smartLastAction =
        body.action === "Ejecutar" ? "execute" : body.action === "Agendar" ? "schedule" : "ignore"
      const { error: smartStateError } = await supabase
        .from("orbita_home_smart_action_states")
        .upsert(
          {
            user_id: userId,
            smart_action_id: body.id,
            status: smartStatus,
            last_action: smartLastAction,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "user_id,smart_action_id" },
        )

      if (!smartStateError) persisted = true
      else warning = "No se pudo persistir estado de acción; se aplicó en UI."
    }

    // Refuerzo de integración operativa para ejecutar/agendar.
    if (body.kind === "smart_action" && body.action && body.action !== "Ignorar") {
      const title =
        body.action === "Agendar"
          ? `Acción agendada (${body.id}) desde Inicio`
          : `Acción ejecutable (${body.id}) desde Inicio`
      const domain = body.action === "Agendar" ? "agenda" : "profesional"
      const { error } = await supabase.from("operational_tasks").insert({
        user_id: userId,
        title,
        completed: false,
        domain,
      })
      if (error && warning == null) warning = "No se pudo reflejar la acción en tareas operativas."
    }

    return NextResponse.json({
      success: true,
      source: "supabase",
      data: {
        id: body.id,
        kind: body.kind,
        action: body.action ?? null,
        executedAt: new Date().toISOString(),
        persisted,
        warning,
      },
    })
  } catch (error: unknown) {
    const detail = error instanceof Error ? error.message : "Error desconocido"
    console.error("ORB_HOME_ACTION ERROR:", detail)
    return NextResponse.json({ success: false, error: "Error ejecutando acción" }, { status: 500 })
  }
}

