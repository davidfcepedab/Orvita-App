import type { AppProfileId } from "../../config/profiles"
import { createSupabaseServerClient } from "../../supabase/server"
import type {
  OrvitaCalendarEvent,
  OrvitaHabit,
  OrvitaProject,
  OrvitaTask,
  OrvitaTaskStatus,
} from "../models"

type OrvitaDbTaskRow = {
  profile_id: string
  id: string
  title: string
  description: string | null
  status: string | null
  priority: number | null
  due_at: string | null
  completed_at: string | null
  project_id: string | null
  archived: boolean | null
  created_at: string | null
  updated_at: string | null
}

function mapTaskRow(profileId: AppProfileId, row: OrvitaDbTaskRow): OrvitaTask {
  const statusRaw = (row.status ?? "pending").toLowerCase()
  const status: OrvitaTaskStatus =
    statusRaw === "in_progress" ? "in_progress" :
      statusRaw === "completed" ? "completed" :
        statusRaw === "cancelled" ? "cancelled" :
          "pending"

  return {
    profileId,
    id: row.id,
    title: row.title,
    description: row.description,
    status,
    priority: row.priority ?? 0,
    dueAt: row.due_at,
    completedAt: row.completed_at,
    projectId: row.project_id,
    archived: Boolean(row.archived),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

export async function listTasksFromSupabase(input: { profileId: AppProfileId }) {
  const supabase = createSupabaseServerClient()
  const res = await supabase
    .from("orbita_tasks")
    .select("*")
    .eq("profile_id", input.profileId)
    .order("due_at", { ascending: true, nullsFirst: false })
    .order("updated_at", { ascending: false })

  if (res.error) throw res.error
  const rows = (res.data || []) as OrvitaDbTaskRow[]
  return rows.map((r) => mapTaskRow(input.profileId, r))
}

export async function upsertTaskToSupabase(input: {
  profileId: AppProfileId
  task: Pick<OrvitaTask, "id" | "title" | "description" | "status" | "priority" | "dueAt" | "projectId" | "archived">
}) {
  const supabase = createSupabaseServerClient()
  const res = await supabase
    .from("orbita_tasks")
    .upsert({
      user_id: input.profileId,
      profile_id: input.profileId,
      id: input.task.id,
      title: input.task.title,
      description: input.task.description,
      status: input.task.status,
      priority: input.task.priority,
      due_at: input.task.dueAt,
      project_id: input.task.projectId,
      archived: input.task.archived,
    }, { onConflict: "profile_id,id" })
    .select("*")
    .single()

  if (res.error) throw res.error
  return mapTaskRow(input.profileId, res.data as OrvitaDbTaskRow)
}

export async function deleteTaskFromSupabase(input: { profileId: AppProfileId; id: string }) {
  const supabase = createSupabaseServerClient()
  const res = await supabase
    .from("orbita_tasks")
    .delete()
    .eq("profile_id", input.profileId)
    .eq("id", input.id)

  if (res.error) throw res.error
  return true
}

type OrvitaDbHabitRow = {
  profile_id: string
  id: string
  title: string
  description: string | null
  frequency: string | null
  goal: number | null
  current_streak: number | null
  longest_streak: number | null
  last_completion_date: string | null
  archived: boolean | null
  created_at: string | null
  updated_at: string | null
}

function mapHabitRow(profileId: AppProfileId, row: OrvitaDbHabitRow): OrvitaHabit {
  const frequency = (row.frequency ?? "daily").toLowerCase() === "weekly" ? "weekly" : "daily"
  return {
    profileId,
    id: row.id,
    title: row.title,
    description: row.description,
    frequency,
    goal: row.goal ?? 1,
    currentStreak: row.current_streak ?? 0,
    longestStreak: row.longest_streak ?? 0,
    lastCompletionDate: row.last_completion_date,
    archived: Boolean(row.archived),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

export async function listHabitsFromSupabase(input: { profileId: AppProfileId }) {
  const supabase = createSupabaseServerClient()
  const res = await supabase
    .from("orbita_habits")
    .select("*")
    .eq("profile_id", input.profileId)
    .order("updated_at", { ascending: false })

  if (res.error) throw res.error
  const rows = (res.data || []) as OrvitaDbHabitRow[]
  return rows.map((r) => mapHabitRow(input.profileId, r))
}

export async function upsertHabitToSupabase(input: {
  profileId: AppProfileId
  habit: Pick<OrvitaHabit, "id" | "title" | "description" | "frequency" | "goal" | "archived">
}) {
  const supabase = createSupabaseServerClient()
  const res = await supabase
    .from("orbita_habits")
    .upsert({
      user_id: input.profileId,
      profile_id: input.profileId,
      id: input.habit.id,
      title: input.habit.title,
      description: input.habit.description,
      frequency: input.habit.frequency,
      goal: input.habit.goal,
      archived: input.habit.archived,
    }, { onConflict: "profile_id,id" })
    .select("*")
    .single()

  if (res.error) throw res.error
  return mapHabitRow(input.profileId, res.data as OrvitaDbHabitRow)
}

export async function deleteHabitFromSupabase(input: { profileId: AppProfileId; id: string }) {
  const supabase = createSupabaseServerClient()
  const res = await supabase
    .from("orbita_habits")
    .delete()
    .eq("profile_id", input.profileId)
    .eq("id", input.id)

  if (res.error) throw res.error
  return true
}

type OrvitaDbProjectRow = {
  profile_id: string
  id: string
  title: string
  description: string | null
  color: string | null
  archived: boolean | null
  created_at: string | null
  updated_at: string | null
}

function mapProjectRow(profileId: AppProfileId, row: OrvitaDbProjectRow): OrvitaProject {
  return {
    profileId,
    id: row.id,
    title: row.title,
    description: row.description,
    color: row.color,
    archived: Boolean(row.archived),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

export async function listProjectsFromSupabase(input: { profileId: AppProfileId }) {
  const supabase = createSupabaseServerClient()
  const res = await supabase
    .from("orbita_projects")
    .select("*")
    .eq("profile_id", input.profileId)
    .order("updated_at", { ascending: false })

  if (res.error) throw res.error
  const rows = (res.data || []) as OrvitaDbProjectRow[]
  return rows.map((r) => mapProjectRow(input.profileId, r))
}

type OrvitaDbEventRow = {
  profile_id: string
  id: string
  title: string
  description: string | null
  start_at: string
  end_at: string | null
  all_day: boolean | null
  location: string | null
  source: string | null
  created_at: string | null
  updated_at: string | null
}

function mapEventRow(profileId: AppProfileId, row: OrvitaDbEventRow): OrvitaCalendarEvent {
  const sourceRaw = (row.source ?? "").toLowerCase()
  const source = sourceRaw === "google" ? "google" : sourceRaw === "manual" ? "manual" : null
  return {
    profileId,
    id: row.id,
    title: row.title,
    description: row.description,
    startAt: row.start_at,
    endAt: row.end_at,
    allDay: Boolean(row.all_day),
    location: row.location,
    source,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

export async function listCalendarEventsFromSupabase(input: { profileId: AppProfileId; from?: string; to?: string }) {
  const supabase = createSupabaseServerClient()
  let q = supabase
    .from("orbita_calendar_events")
    .select("*")
    .eq("profile_id", input.profileId)
    .order("start_at", { ascending: true })

  if (input.from) q = q.gte("start_at", input.from)
  if (input.to) q = q.lte("start_at", input.to)

  const res = await q
  if (res.error) throw res.error
  const rows = (res.data || []) as OrvitaDbEventRow[]
  return rows.map((r) => mapEventRow(input.profileId, r))
}
