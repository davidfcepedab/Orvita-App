"use client"

import HealthOperationsV3 from "@/app/components/orbita-v3/health/HealthOperationsV3"
import TrainingOperationsV3 from "@/app/components/orbita-v3/training/TrainingOperationsV3"
import AppleHealthLuxurySection from "@/app/components/orbita-v3/salud/AppleHealthLuxurySection"
import { useSaludContext } from "@/app/salud/_hooks/useSaludContext"

export default function SaludDashboardV3() {
  const salud = useSaludContext()

  return (
    <div className="orv-page-shell relative isolate min-h-screen space-y-10 pb-32 pt-2">
      <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(120%_70%_at_50%_-10%,rgba(56,189,248,0.14),transparent_55%),radial-gradient(90%_60%_at_100%_0%,rgba(52,211,153,0.12),transparent_45%),linear-gradient(180deg,#020617_0%,#0b1224_45%,#020617_100%)]" />

      <AppleHealthLuxurySection salud={salud} />
      <HealthOperationsV3 salud={salud} />
      <TrainingOperationsV3 salud={salud} />
    </div>
  )
}