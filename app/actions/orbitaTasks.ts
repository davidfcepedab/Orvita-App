"use server"

import { revalidateTag } from "next/cache"
import { isAppProfileId, resolveDefaultProfileId, type AppProfileId } from "@/lib/config/profiles"
import type { OrvitaTask } from "@/lib/orbita/models"
import { upsertOrvitaTask } from "@/lib/orbita/repositories/tasksRepo"

export async function upsertTaskAction(input: {
  profileId?: string
  task: Pick<OrvitaTask, "id" | "title" | "description" | "status" | "priority" | "dueAt" | "projectId" | "archived">
}) {
  const profileId: AppProfileId = isAppProfileId(input.profileId) ? input.profileId : resolveDefaultProfileId()
  const result = await upsertOrvitaTask({ profileId, task: input.task })

  // Si luego usas fetch con tags, este tag permite invalidar vistas de Agenda.
  revalidateTag(`orbita:tasks:${profileId}`, "default")

  return result.data
}
