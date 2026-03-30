import type { SupabaseClient } from "@supabase/supabase-js"

type GoogleTaskLike = {
  id?: string
  title?: string
  status?: string
  due?: string
  deleted?: boolean
}

/** Crea filas en operational_tasks (agenda) para tareas de Google aún sin espejo local. */
export async function mirrorGoogleTasksToOperationalTasks(
  db: SupabaseClient,
  params: { userId: string; householdId: string; googleTasks: GoogleTaskLike[] },
): Promise<number> {
  const { userId, householdId, googleTasks } = params
  const active = googleTasks.filter((t) => typeof t.id === "string" && t.id.length > 0 && t.deleted !== true)
  if (active.length === 0) return 0

  const ids = active.map((t) => t.id as string)
  const { data: existing } = await db
    .from("operational_tasks")
    .select("google_task_id")
    .eq("user_id", userId)
    .eq("domain", "agenda")
    .in("google_task_id", ids)

  const have = new Set(
    (existing ?? [])
      .map((r) => r.google_task_id)
      .filter((id): id is string => typeof id === "string"),
  )

  const rows = active
    .filter((t) => t.id && !have.has(t.id))
    .map((task) => {
      const gid = task.id as string
      const title = String(task.title ?? "").trim() || "Sin título"
      const completed = task.status === "completed"
      const dueRaw = task.due
      const due_date =
        typeof dueRaw === "string" && dueRaw.length >= 10 ? dueRaw.slice(0, 10) : null
      return {
        user_id: userId,
        household_id: householdId,
        title,
        status: completed ? ("completed" as const) : ("pending" as const),
        completed,
        priority: "Media" as const,
        estimated_minutes: 30,
        due_date,
        assignee_id: null,
        assignee_name: null,
        created_by: userId,
        domain: "agenda" as const,
        google_task_id: gid,
      }
    })

  if (rows.length === 0) return 0
  const { error } = await db.from("operational_tasks").insert(rows)
  if (error) throw new Error(error.message)
  return rows.length
}
