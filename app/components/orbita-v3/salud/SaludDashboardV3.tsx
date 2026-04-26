"use client"

import HealthOperationsV3 from "@/app/components/orbita-v3/health/HealthOperationsV3"
import TrainingOperationsV3 from "@/app/components/orbita-v3/training/TrainingOperationsV3"
import AppleHealthLuxurySection from "@/app/components/orbita-v3/salud/AppleHealthLuxurySection"
import { useSaludContext } from "@/app/salud/_hooks/useSaludContext"
import { useHealthAutoMetrics } from "@/app/hooks/useHealthAutoMetrics"

export default function SaludDashboardV3() {
  const salud = useSaludContext()
  const autoHealth = useHealthAutoMetrics()

  return (
    <>
      <AppleHealthLuxurySection
        salud={salud}
        latest={autoHealth.latest}
        loading={autoHealth.loading}
        onRefresh={autoHealth.refetch}
      />
      <HealthOperationsV3
        salud={salud}
        latest={autoHealth.latest}
        timeline={autoHealth.timeline}
        analytics={autoHealth.analytics}
        healthMetricsLoading={autoHealth.loading}
      />
      <TrainingOperationsV3 salud={salud} />
    </>
  )
}
