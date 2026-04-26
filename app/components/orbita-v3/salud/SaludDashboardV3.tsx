"use client"

import HealthOperationsV3 from "@/app/components/orbita-v3/health/HealthOperationsV3"
import TrainingOperationsV3 from "@/app/components/orbita-v3/training/TrainingOperationsV3"
import AppleHealthLuxurySection from "@/app/components/orbita-v3/salud/AppleHealthLuxurySection"
import { HealthCorrelationsPanel } from "@/app/components/orbita-v3/salud/HealthCorrelationsPanel"
import { useSaludContext } from "@/app/salud/_hooks/useSaludContext"
import { useHealthAutoMetrics } from "@/app/hooks/useHealthAutoMetrics"
import { useOrbitaSkin } from "@/app/contexts/AppContext"
import { saludPageBackdropStyle } from "@/lib/salud/saludThemeStyles"

export default function SaludDashboardV3() {
  const salud = useSaludContext()
  const autoHealth = useHealthAutoMetrics()
  const theme = useOrbitaSkin()

  return (
    <div
      className="relative isolate min-h-screen space-y-10 pb-32 pt-2"
      style={{ backgroundColor: theme.bg, color: theme.text }}
    >
      <div className="pointer-events-none absolute inset-0 -z-10" style={saludPageBackdropStyle(theme)} />

      <AppleHealthLuxurySection
        salud={salud}
        latest={autoHealth.latest}
        loading={autoHealth.loading}
        onRefresh={autoHealth.refetch}
      />
      <HealthOperationsV3 salud={salud} latest={autoHealth.latest} />
      <HealthCorrelationsPanel
        salud={salud}
        latest={autoHealth.latest}
        timeline={autoHealth.timeline}
        analytics={autoHealth.analytics}
        loading={autoHealth.loading}
      />
      <TrainingOperationsV3 salud={salud} />
    </div>
  )
}
