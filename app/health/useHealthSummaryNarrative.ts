"use client"

import { useEffect, useMemo, useState } from "react"
import {
  buildFallbackHealthSummaryParagraph,
  buildHealthSummaryFacts,
  buildHealthSummaryPromptFacts,
  macroNutritionHint,
  type HealthSummaryFacts,
} from "@/lib/health/healthSummaryNarrative"

type UseArgs = {
  loading: boolean
  bodyBattery: number
  sleepScore: number
  recoveryStatus: "optimal" | "stable" | "fragile"
  hrv: number
  restingHR: number
  hydrationCurrent: number
  hydrationTarget: number
  trainedToday: boolean
  activeSupplements: number
  supplementsLoading: boolean
  tendencia: { value: number }[]
  macros: { label: string; current: number; target: number }[]
}

export function useHealthSummaryNarrative(args: UseArgs) {
  const tendenciaKey = args.tendencia.map((t) => t.value).join(",")
  const macroKey = args.macros.map((m) => `${m.label}:${m.current}:${m.target}`).join("|")

  const facts: HealthSummaryFacts = useMemo(() => {
    const nutritionHint = macroNutritionHint(args.macros)
    return buildHealthSummaryFacts({
      bodyBattery: args.bodyBattery,
      sleepScore: args.sleepScore,
      recoveryStatus: args.recoveryStatus,
      hrv: args.hrv,
      restingHR: args.restingHR,
      hydrationCurrent: args.hydrationCurrent,
      hydrationTarget: args.hydrationTarget,
      trainedToday: args.trainedToday,
      activeSupplements: args.activeSupplements,
      supplementsLoading: args.supplementsLoading,
      tendencia: args.tendencia,
      nutritionHint,
    })
  }, [
    args.activeSupplements,
    args.bodyBattery,
    args.hydrationCurrent,
    args.hydrationTarget,
    args.hrv,
    macroKey,
    args.recoveryStatus,
    args.restingHR,
    args.sleepScore,
    args.supplementsLoading,
    tendenciaKey,
    args.trainedToday,
  ])

  const fallbackParagraph = useMemo(() => buildFallbackHealthSummaryParagraph(facts), [facts])
  const promptFacts = useMemo(() => buildHealthSummaryPromptFacts(facts), [facts])

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
          body: JSON.stringify({ promptFacts }),
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
