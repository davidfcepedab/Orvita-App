"use server"

import { revalidateTag } from "next/cache"
import { isAppProfileId, resolveDefaultProfileId, type AppProfileId } from "@/lib/config/profiles"
import type { OrvitaHabit } from "@/lib/orbita/models"
import { upsertOrvitaHabit } from "@/lib/orbita/repositories/habitsRepo"

export async function upsertHabitAction(input: {
  profileId?: string
  habit: Pick<OrvitaHabit, "id" | "title" | "description" | "frequency" | "goal" | "archived">
}) {
  const profileId: AppProfileId = isAppProfileId(input.profileId) ? input.profileId : resolveDefaultProfileId()
  const result = await upsertOrvitaHabit({ profileId, habit: input.habit })

  revalidateTag(`orbita:habits:${profileId}`, "default")

  return result.data
}
