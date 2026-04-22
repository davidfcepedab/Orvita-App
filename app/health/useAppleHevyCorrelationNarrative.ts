"use client"

import { useEffect, useMemo, useState } from "react"
import type { AppleHealthContextSignals } from "@/lib/operational/types"
import type { TrainingDay } from "@/src/modules/training/types"
import {
  buildAppleHevyCorrelationPromptFacts,
  buildFallbackAppleHevyCorrelationParagraph,
} from "@/lib/health/appleHevyCorrelationNarrative"

type Args = {
  loading: boolean
  apple: AppleHealthContextSignals | null
  hevyToday: TrainingDay | null
  checkSalud?: number
  checkFisico?: number
}

export function useAppleHevyCorrelationNarrative(args: Args) {
  const promptFacts = useMemo(
    () =>
      buildAppleHevyCorrelationPromptFacts(args.apple, args.hevyToday, {
        checkSalud: args.checkSalud,
        checkFisico: args.checkFisico,
      }),
    [args.apple, args.hevyToday, args.checkSalud, args.checkFisico],
  )

  const fallbackParagraph = useMemo(
    () => buildFallbackAppleHevyCorrelationParagraph(args.apple, args.hevyToday),
    [args.apple, args.hevyToday],
  )

  const [aiRefined, setAiRefined] = useState<string | null>(null)
  const [aiPending, setAiPending] = useState(false)

  useEffect(() => {
    setAiRefined(null)
  }, [promptFacts])

  useEffect(() => {
    if (args.loading) return

    const ac = new AbortController()
    setAiPending(true)

    ;(async () => {
      try {
        const res = await fetch("/api/health-summary", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ promptFacts, variant: "apple_hevy" as const }),
          signal: ac.signal,
        })
        if (res.status === 501) {
          return
        }
        if (!res.ok) {
          return
        }
        const data = (await res.json()) as { ok?: boolean; summary?: string }
        if (data.ok && typeof data.summary === "string" && data.summary.trim()) {
          setAiRefined(data.summary.trim())
        }
      } catch {
        /* abort o red */
      } finally {
        if (!ac.signal.aborted) {
          setAiPending(false)
        }
      }
    })()

    return () => ac.abort()
  }, [args.loading, promptFacts])

  const paragraph = args.loading ? "" : aiRefined ?? fallbackParagraph
  const usedAi = Boolean(aiRefined)

  return { paragraph, usedAi, aiPending: aiPending && !args.loading && !aiRefined }
}
