import type { SupabaseClient } from "@supabase/supabase-js"
import type { GoogleTaskDTO } from "@/lib/google/types"
import { isGoogleTaskDone } from "@/lib/agenda/googleTasksUpcoming"

type ExternalTaskRow = {
  google_task_id: string
  title: string | null
  status: string | null
  due_date: string | null
  local_assignee_user_id?: string | null
  local_priority?: string | null
}

function normalizeLocalPriority(v: string | null | undefined): GoogleTaskDTO["localPriority"] {
  if (v === "Alta" || v === "Media" || v === "Baja") return v
  return null
}

export function externalTaskRowToDto(row: ExternalTaskRow): GoogleTaskDTO {
  const due =
    row.due_date != null && String(row.due_date).trim()
      ? new Date(row.due_date).toISOString()
      : null
  return {
    id: row.google_task_id,
    title: row.title?.trim() ? row.title.trim() : "(Sin título)",
    status: row.status,
    due,
    localAssigneeUserId: row.local_assignee_user_id ?? null,
    localPriority: normalizeLocalPriority(row.local_priority ?? null),
  }
}

/**
 * Lista de tareas desde `external_tasks` (sin llamar a Google). Relleno por POST …/tasks/sync.
 */
export async function fetchTasksFromExternalTable(
  supabase: SupabaseClient,
  userId: string,
  options: { showCompleted: boolean },
): Promise<{ tasks: GoogleTaskDTO[]; dbError: string | null }> {
  const { data, error } = await supabase
    .from("external_tasks")
    .select("google_task_id, title, status, due_date, local_assignee_user_id, local_priority")
    .eq("user_id", userId)
    .is("deleted_at", null)
    .order("due_date", { ascending: true, nullsFirst: false })
    .limit(8000)

  if (error) {
    return { tasks: [], dbError: error.message }
  }

  let rows = (data ?? []) as ExternalTaskRow[]
  if (!options.showCompleted) {
    rows = rows.filter((r) => !isGoogleTaskDone(r.status))
  }

  return { tasks: rows.map(externalTaskRowToDto), dbError: null }
}

export async function fetchExternalTaskDtoByGoogleId(
  supabase: SupabaseClient,
  userId: string,
  googleTaskId: string,
): Promise<GoogleTaskDTO | null> {
  const { data, error } = await supabase
    .from("external_tasks")
    .select("google_task_id, title, status, due_date, local_assignee_user_id, local_priority")
    .eq("user_id", userId)
    .eq("google_task_id", googleTaskId)
    .is("deleted_at", null)
    .maybeSingle()

  if (error || !data) return null
  return externalTaskRowToDto(data as ExternalTaskRow)
}
