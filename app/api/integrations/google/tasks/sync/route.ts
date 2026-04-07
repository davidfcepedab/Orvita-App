import { NextRequest, NextResponse } from "next/server"
import { requireUser } from "@/lib/api/requireUser"
import { createServiceClient } from "@/lib/supabase/server"
import { mirrorGoogleTasksToOperationalTasks } from "@/lib/agenda/mirrorGoogleTasksToOperational"
import { getHouseholdId } from "@/lib/households/getHouseholdId"
import {
  mapGoogleSyncErrorToUserMessage,
  refreshAccessTokenIfNeeded,
  type GoogleIntegrationRecord,
} from "@/lib/integrations/google"
import { normalizeGoogleTaskDueToIso } from "@/lib/google/googleTasksApi"

export const runtime = "nodejs"

type GoogleTask = {
  id?: string
  title?: string
  status?: string
  due?: string
  deleted?: boolean
  updated?: string
  [key: string]: unknown
}

type TasksApiResponse = {
  items?: GoogleTask[]
  nextPageToken?: string
}

export async function POST(req: NextRequest) {
  try {
    const auth = await requireUser(req)
    if (auth instanceof NextResponse) return auth
    const { supabase, userId } = auth
    const db = createServiceClient()

    const { data: integration, error: integrationError } = await db
      .from("user_integrations")
      .select("id, user_id, provider, access_token, refresh_token, expires_at")
      .eq("user_id", userId)
      .eq("provider", "google")
      .maybeSingle()

    if (integrationError) throw integrationError
    if (!integration) {
      return NextResponse.json(
        {
          success: false,
          error: "No hay cuenta de Google vinculada. Conéctala desde Configuración.",
        },
        { status: 404 },
      )
    }

    const accessToken = await refreshAccessTokenIfNeeded(integration as GoogleIntegrationRecord)

    const { data: lastSync } = await db
      .from("external_tasks")
      .select("synced_at")
      .eq("user_id", userId)
      .order("synced_at", { ascending: false })
      .limit(1)
      .maybeSingle()

    const updatedMin = lastSync?.synced_at ? new Date(lastSync.synced_at).toISOString() : null

    let pageToken: string | undefined
    let imported = 0
    let updated = 0
    let mirroredAgenda = 0
    const householdId = await getHouseholdId(supabase, userId)

    do {
      const params = new URLSearchParams({
        showDeleted: "true",
        maxResults: "100",
      })
      if (updatedMin) params.set("updatedMin", updatedMin)
      if (pageToken) params.set("pageToken", pageToken)

      const response = await fetch(
        `https://www.googleapis.com/tasks/v1/lists/@default/tasks?${params.toString()}`,
        {
          headers: { Authorization: `Bearer ${accessToken}` },
        }
      )

      if (!response.ok) {
        const detail = await response.text()
        throw new Error(`Google Tasks API error: ${detail}`)
      }

      const payload = (await response.json()) as TasksApiResponse
      const items = payload.items ?? []

      const ids = items
        .map((item) => item.id)
        .filter((id): id is string => typeof id === "string" && id.length > 0)

      if (ids.length > 0) {
        const { data: existing } = await db
          .from("external_tasks")
          .select("google_task_id")
          .eq("user_id", userId)
          .in("google_task_id", ids)

        const existingSet = new Set(
          (existing ?? []).map((row) => row.google_task_id).filter((id) => typeof id === "string")
        )

        imported += ids.length - existingSet.size
        updated += existingSet.size

        const now = new Date().toISOString()
        const rows = items
          .map((task) => {
            const googleTaskId = task.id
            if (!googleTaskId) return null
            const dueDate = normalizeGoogleTaskDueToIso(task.due)
            const isDeleted = task.deleted === true
            return {
              user_id: userId,
              google_task_id: googleTaskId,
              title: task.title ?? null,
              status: task.status ?? null,
              due_date: dueDate,
              raw: task as Record<string, unknown>,
              synced_at: now,
              deleted_at: isDeleted ? now : null,
            }
          })
          .filter((row): row is NonNullable<typeof row> => row !== null)

        if (rows.length > 0) {
          const { error: upsertError } = await db
            .from("external_tasks")
            .upsert(rows, { onConflict: "user_id,google_task_id" })
          if (upsertError) throw new Error(upsertError.message || "Error guardando tareas")
        }

        if (householdId && items.length > 0) {
          mirroredAgenda += await mirrorGoogleTasksToOperationalTasks(db, {
            userId,
            householdId,
            googleTasks: items,
          })
        }
      }

      pageToken = payload.nextPageToken
    } while (pageToken)

    return NextResponse.json({ success: true, imported, updated, mirroredAgenda })
  } catch (error: unknown) {
    const detail = error instanceof Error ? error.message : "Unknown error"
    console.error("GOOGLE TASKS SYNC ERROR:", detail)
    return NextResponse.json(
      { success: false, error: mapGoogleSyncErrorToUserMessage("tasks", detail) },
      { status: 500 },
    )
  }
}
