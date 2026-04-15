import { NextRequest, NextResponse } from "next/server"
import { requireUser } from "@/lib/api/requireUser"
import { isAppMockMode } from "@/lib/checkins/flags"
import { fetchNotificationPrefs, mergePrefs, type OrbitaNotificationPreferences } from "@/lib/notifications/notificationPrefs"

export const runtime = "nodejs"

const PATCH_KEYS = new Set([
  "push_enabled_global",
  "push_checkin_reminder",
  "push_habit_reminder",
  "push_commitment_reminder",
  "push_finance_threshold",
  "push_agenda_upcoming",
  "push_training_reminder",
  "push_digest_morning",
  "push_weekly_summary",
  "push_partner_activity",
  "finance_savings_threshold_pct",
  "reminder_hour_local",
  "digest_hour_local",
  "weekly_digest_dow",
  "timezone",
  "quiet_hours_start",
  "quiet_hours_end",
  "email_digest_enabled",
  "email_weekly_enabled",
] as const)

type PatchKey = (typeof PATCH_KEYS extends Set<infer U> ? U : never) & string

export async function GET(req: NextRequest) {
  try {
    if (isAppMockMode()) {
      return NextResponse.json({
        success: true,
        data: mergePrefs("00000000-0000-0000-0000-000000000000", null),
      })
    }

    const auth = await requireUser(req)
    if (auth instanceof NextResponse) return auth

    const prefs = await fetchNotificationPrefs(auth.supabase, auth.userId)
    return NextResponse.json({ success: true, data: prefs })
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Error"
    return NextResponse.json({ success: false, error: msg }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  try {
    if (isAppMockMode()) {
      return NextResponse.json({ success: true, data: mergePrefs("00000000-0000-0000-0000-000000000000", null) })
    }

    const auth = await requireUser(req)
    if (auth instanceof NextResponse) return auth

    let body: unknown
    try {
      body = await req.json()
    } catch {
      return NextResponse.json({ success: false, error: "JSON inválido" }, { status: 400 })
    }

    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return NextResponse.json({ success: false, error: "Cuerpo inválido" }, { status: 400 })
    }

    const row = parsePrefsPatch(body as Record<string, unknown>)
    if ("error" in row) {
      return NextResponse.json({ success: false, error: row.error }, { status: 400 })
    }

    const payload = {
      user_id: auth.userId,
      ...row,
      updated_at: new Date().toISOString(),
    }

    const { error } = await auth.supabase.from("orbita_notification_preferences").upsert(payload, {
      onConflict: "user_id",
    })

    if (error) {
      console.error("notification prefs upsert:", error.message)
      return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }

    const prefs = await fetchNotificationPrefs(auth.supabase, auth.userId)
    return NextResponse.json({ success: true, data: prefs })
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Error"
    return NextResponse.json({ success: false, error: msg }, { status: 500 })
  }
}

function parsePrefsPatch(
  raw: Record<string, unknown>,
): Partial<OrbitaNotificationPreferences> | { error: string } {
  const out: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(raw)) {
    if (!PATCH_KEYS.has(k as PatchKey)) continue
    switch (k) {
      case "push_enabled_global":
      case "push_checkin_reminder":
      case "push_habit_reminder":
      case "push_commitment_reminder":
      case "push_finance_threshold":
      case "push_agenda_upcoming":
      case "push_training_reminder":
      case "push_digest_morning":
      case "push_weekly_summary":
      case "push_partner_activity":
      case "email_digest_enabled":
      case "email_weekly_enabled": {
        if (typeof v !== "boolean") return { error: `${k} debe ser booleano` }
        out[k] = v
        break
      }
      case "finance_savings_threshold_pct": {
        if (v === null) {
          out[k] = null
          break
        }
        if (typeof v !== "number" || !Number.isFinite(v)) {
          return { error: "finance_savings_threshold_pct debe ser número o null" }
        }
        out[k] = v
        break
      }
      case "reminder_hour_local":
      case "digest_hour_local": {
        if (typeof v !== "number" || !Number.isInteger(v) || v < 0 || v > 23) {
          return { error: `${k} debe ser entero 0–23` }
        }
        out[k] = v
        break
      }
      case "weekly_digest_dow": {
        if (typeof v !== "number" || !Number.isInteger(v) || v < 0 || v > 6) {
          return { error: "weekly_digest_dow debe ser 0–6" }
        }
        out[k] = v
        break
      }
      case "timezone": {
        if (typeof v !== "string" || !v.trim()) return { error: "timezone inválido" }
        out[k] = v.trim()
        break
      }
      case "quiet_hours_start":
      case "quiet_hours_end": {
        if (v === null) {
          out[k] = null
          break
        }
        if (typeof v !== "number" || !Number.isInteger(v) || v < 0 || v > 23) {
          return { error: `${k} debe ser null o entero 0–23` }
        }
        out[k] = v
        break
      }
      default:
        break
    }
  }

  if (Object.keys(out).length === 0) {
    return { error: "Ningún campo reconocido para actualizar" }
  }

  return out as Partial<OrbitaNotificationPreferences>
}
