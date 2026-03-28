import { NextRequest, NextResponse } from "next/server"
import { requireUser } from "@/lib/api/requireUser"
import { isAppMockMode } from "@/lib/checkins/flags"
import type { HealthPreferencesPayload } from "@/lib/health/healthPrefsTypes"

export const runtime = "nodejs"

function mergePrefs(base: HealthPreferencesPayload, patch: HealthPreferencesPayload): HealthPreferencesPayload {
  return { ...base, ...patch }
}

export async function GET(req: NextRequest) {
  if (isAppMockMode()) {
    return NextResponse.json({ success: true, preferences: {} satisfies HealthPreferencesPayload })
  }

  const auth = await requireUser(req)
  if (auth instanceof NextResponse) return auth

  const { data, error } = await auth.supabase
    .from("users")
    .select("health_preferences")
    .eq("id", auth.userId)
    .maybeSingle()

  if (error) {
    console.error("health preferences GET:", error.message)
    return NextResponse.json({ success: false, error: "No se pudieron leer preferencias" }, { status: 500 })
  }

  const raw = data?.health_preferences
  const preferences =
    raw && typeof raw === "object" && !Array.isArray(raw) ? (raw as HealthPreferencesPayload) : {}

  return NextResponse.json({ success: true, preferences })
}

export async function POST(req: NextRequest) {
  if (isAppMockMode()) {
    return NextResponse.json({ success: true, preferences: {} as HealthPreferencesPayload })
  }

  const auth = await requireUser(req)
  if (auth instanceof NextResponse) return auth

  let patch: HealthPreferencesPayload
  try {
    patch = (await req.json()) as HealthPreferencesPayload
  } catch {
    return NextResponse.json({ success: false, error: "JSON inválido" }, { status: 400 })
  }

  const { data: row, error: readErr } = await auth.supabase
    .from("users")
    .select("health_preferences")
    .eq("id", auth.userId)
    .maybeSingle()

  if (readErr) {
    console.error("health preferences POST read:", readErr.message)
    return NextResponse.json({ success: false, error: "No se pudieron leer preferencias" }, { status: 500 })
  }

  const prev =
    row?.health_preferences && typeof row.health_preferences === "object" && !Array.isArray(row.health_preferences)
      ? (row.health_preferences as HealthPreferencesPayload)
      : {}

  const next = mergePrefs(prev, patch)

  const { error: writeErr } = await auth.supabase.from("users").update({ health_preferences: next }).eq("id", auth.userId)

  if (writeErr) {
    console.error("health preferences POST write:", writeErr.message)
    return NextResponse.json({ success: false, error: "No se pudieron guardar preferencias" }, { status: 500 })
  }

  return NextResponse.json({ success: true, preferences: next })
}
