"use client"

import { useMemo } from "react"
import HealthOperationsV3 from "@/app/components/orbita-v3/health/HealthOperationsV3"
import { useSaludContext } from "@/app/salud/_hooks/useSaludContext"
import { useHealthAutoMetrics } from "@/app/hooks/useHealthAutoMetrics"
import { useTraining } from "@/src/modules/training/useTraining"
import { appleDaySignalsFromHealthMetric } from "@/lib/health/appleHevyRelation"
import { agendaTodayYmd } from "@/lib/agenda/localDateKey"
import { buildPlanVsExecution, buildTrainingReadiness } from "@/lib/training/trainingOperationalDerivations"
import { buildSaludDecisionBrief } from "@/lib/salud/saludDecisionBrief"
import { HeroDecisionCard } from "@/app/components/orbita-v3/salud/HeroDecisionCard"
import { SaludInsightSection } from "@/app/components/orbita-v3/salud/SaludInsightSection"
import AppleHealthLuxurySection from "@/app/components/orbita-v3/salud/AppleHealthLuxurySection"
import { appleHealthSyncStale, buildAppleHealthHeroSyncLine } from "@/lib/salud/appleHealthSyncToolbar"

export default function SaludDashboardV3() {
  const salud = useSaludContext()
  const autoHealth = useHealthAutoMetrics()
  const { days, todayState } = useTraining()
  const todayIso = agendaTodayYmd()

  const staleSync = useMemo(() => appleHealthSyncStale(autoHealth.latest?.observed_at), [autoHealth.latest?.observed_at])

  const appleSignals = useMemo(() => appleDaySignalsFromHealthMetric(autoHealth.latest), [autoHealth.latest])
  const readiness = useMemo(() => buildTrainingReadiness(appleSignals, days), [appleSignals, days])
  const planVsExecution = useMemo(() => buildPlanVsExecution(days, todayState, todayIso), [days, todayState, todayIso])
  const brief = useMemo(
    () =>
      buildSaludDecisionBrief({
        salud,
        latest: autoHealth.latest,
        readiness,
        plan: planVsExecution,
        todayState,
        staleSync,
      }),
    [salud, autoHealth.latest, readiness, planVsExecution, todayState, staleSync],
  )

  const syncLine = useMemo(
    () => buildAppleHealthHeroSyncLine(autoHealth.latest, staleSync),
    [autoHealth.latest, staleSync],
  )

  if (salud.loading) {
    return (
      <section
        className="orbita-page-stack mx-auto w-full max-w-[min(72rem,calc(100vw-1.5rem))] space-y-4 px-1 py-2 text-sm text-[var(--color-text-secondary)]"
        aria-label="Salud: decisión, Apple Health e interpretación"
        aria-busy="true"
      >
        Cargando tu resumen de salud…
      </section>
    )
  }

  if (salud.error) {
    return (
      <section
        className="orbita-page-stack mx-auto w-full max-w-[min(72rem,calc(100vw-1.5rem))] space-y-4 px-1 py-2 text-sm text-[var(--color-accent-finance)]"
        aria-label="Salud: decisión, Apple Health e interpretación"
      >
        {salud.error}
      </section>
    )
  }

  return (
    <section
      className="orbita-page-stack mx-auto w-full max-w-[min(72rem,calc(100vw-1.5rem))] space-y-4"
      aria-label="Salud: decisión, Apple Health e interpretación"
    >
      <HeroDecisionCard brief={brief} syncLine={syncLine} />

      <AppleHealthLuxurySection
        salud={salud}
        latest={autoHealth.latest}
        loading={autoHealth.loading}
        onRefresh={autoHealth.refetch}
      />

      <SaludInsightSection brief={brief} />

      <section className="space-y-4 px-0.5 sm:px-0">
        <HealthOperationsV3
          salud={salud}
          latest={autoHealth.latest}
          timeline={autoHealth.timeline}
          analytics={autoHealth.analytics}
          healthMetricsLoading={autoHealth.loading}
          layout="full"
        />
      </section>
    </section>
  )
}
