import type { SupabaseClient } from "@supabase/supabase-js"
import type { GoogleTaskDTO } from "@/lib/google/types"
import { isGoogleTaskDone } from "@/lib/agenda/googleTasksUpcoming"

type ExternalTaskRow = {
  google_task_id: string
  title: string | null
  status: string | null
  due_date: string | null
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
    .select("google_task_id, title, status, due_date")
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
