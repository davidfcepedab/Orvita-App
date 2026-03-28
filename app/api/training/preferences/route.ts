import { NextRequest, NextResponse } from "next/server"
import { requireUser } from "@/lib/api/requireUser"
import { isAppMockMode } from "@/lib/checkins/flags"
import type { TrainingPreferencesPayload } from "@/lib/training/trainingPrefsTypes"

export const runtime = "nodejs"

function mergePrefs(base: TrainingPreferencesPayload, patch: TrainingPreferencesPayload): TrainingPreferencesPayload {
  return { ...base, ...patch }
}

export async function GET(req: NextRequest) {
  if (isAppMockMode()) {
    return NextResponse.json({ success: true, preferences: {} satisfies TrainingPreferencesPayload })
  }

  const auth = await requireUser(req)
  if (auth instanceof NextResponse) return auth

  const { data, error } = await auth.supabase
    .from("users")
    .select("training_preferences")
    .eq("id", auth.userId)
    .maybeSingle()

  if (error) {
    console.error("training preferences GET:", error.message)
    return NextResponse.json({ success: false, error: "No se pudieron leer preferencias" }, { status: 500 })
  }

  const raw = data?.training_preferences
  const preferences =
    raw && typeof raw === "object" && !Array.isArray(raw) ? (raw as TrainingPreferencesPayload) : {}

  return NextResponse.json({ success: true, preferences })
}

export async function POST(req: NextRequest) {
  if (isAppMockMode()) {
    return NextResponse.json({ success: true, preferences: {} as TrainingPreferencesPayload })
  }

  const auth = await requireUser(req)
  if (auth instanceof NextResponse) return auth

  let patch: TrainingPreferencesPayload
  try {
    patch = (await req.json()) as TrainingPreferencesPayload
  } catch {
    return NextResponse.json({ success: false, error: "JSON inválido" }, { status: 400 })
  }

  const { data: row, error: readErr } = await auth.supabase
    .from("users")
    .select("training_preferences")
    .eq("id", auth.userId)
    .maybeSingle()

  if (readErr) {
    console.error("training preferences POST read:", readErr.message)
    return NextResponse.json({ success: false, error: "No se pudieron leer preferencias" }, { status: 500 })
  }

  const prev =
    row?.training_preferences && typeof row.training_preferences === "object" && !Array.isArray(row.training_preferences)
      ? (row.training_preferences as TrainingPreferencesPayload)
      : {}

  const next = mergePrefs(prev, patch)

  const { error: writeErr } = await auth.supabase.from("users").update({ training_preferences: next }).eq("id", auth.userId)

  if (writeErr) {
    console.error("training preferences POST write:", writeErr.message)
    return NextResponse.json({ success: false, error: "No se pudieron guardar preferencias" }, { status: 500 })
  }

  return NextResponse.json({ success: true, preferences: next })
}
