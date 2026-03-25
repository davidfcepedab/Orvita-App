import type { AppProfileId } from "../config/profiles"

export type OrvitaTaskStatus = "pending" | "in_progress" | "completed" | "cancelled"

export type OrvitaTask = {
  profileId: AppProfileId
  id: string
  title: string
  description: string | null
  status: OrvitaTaskStatus
  priority: number
  dueAt: string | null // ISO
  completedAt: string | null // ISO
  projectId: string | null
  archived: boolean
  updatedAt: string | null // ISO
  createdAt: string | null // ISO
}

export type OrvitaProject = {
  profileId: AppProfileId
  id: string
  title: string
  description: string | null
  color: string | null
  archived: boolean
  updatedAt: string | null
  createdAt: string | null
}

export type OrvitaHabitFrequency = "daily" | "weekly"

export type OrvitaHabit = {
  profileId: AppProfileId
  id: string
  title: string
  description: string | null
  frequency: OrvitaHabitFrequency
  goal: number
  currentStreak: number
  longestStreak: number
  lastCompletionDate: string | null // YYYY-MM-DD
  archived: boolean
  updatedAt: string | null
  createdAt: string | null
}

export type OrvitaCalendarEventSource = "google" | "manual"

export type OrvitaCalendarEvent = {
  profileId: AppProfileId
  id: string
  title: string
  description: string | null
  startAt: string // ISO
  endAt: string | null // ISO
  allDay: boolean
  location: string | null
  source: OrvitaCalendarEventSource | null
  updatedAt: string | null
  createdAt: string | null
}

