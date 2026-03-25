"use client"

import { useEffect } from "react"
import { createSupabaseBrowserClient } from "@/lib/supabase/browser"
import type { AppProfileId } from "@/lib/config/profiles"

export function HabitsRealtimeListener(props: {
  profileId: AppProfileId
  onChange: () => void
}) {
  const { profileId, onChange } = props

  useEffect(() => {
    const supabase = createSupabaseBrowserClient()

    const channel = supabase
      .channel(`orbita:habits:${profileId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "orbita_habits",
          filter: `profile_id=eq.${profileId}`,
        },
        () => onChange()
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [profileId, onChange])

  return null
}

