"use client"

import Link from "next/link"
import { useOperationalContext } from "@/app/hooks/useOperationalContext"

export default function Sistema() {
  const { data, loading, error } = useOperationalContext()

  if (loading) {
    return <div className="p-6 text-center text-gray-500">Cargando sistema...</div>
  }

  if (error) {
    return <div className="p-6 text-center text-red-600">Error: {error}</div>
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">Sistema</h1>

      <div className="card">
        <p className="text-sm text-gray-500">IA Readiness</p>
        <p className="text-4xl font-bold text-[#2DD4BF]">Preparado</p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="card">
          <p className="text-xs text-gray-500">Global</p>
          <p className="text-3xl font-bold">{data?.score_global ?? 0}</p>
        </div>
        <div className="card">
          <p className="text-xs text-gray-500">Fisico</p>
          <p className="text-3xl font-bold">{data?.score_fisico ?? 0}</p>
        </div>
        <div className="card">
          <p className="text-xs text-gray-500">Recuperacion</p>
          <p className="text-3xl font-bold">{data?.score_recuperacion ?? 0}</p>
        </div>
      </div>

      <div className="card">
        <p className="text-sm text-gray-500">Automatizaciones activas</p>
        <p className="mt-2 text-sm text-gray-600">
          `/api/cron/checkins/sync` protegido por `CRON_SECRET` o `INTERNAL_API_TOKEN`.
        </p>
        <Link href="/checkin" className="mt-4 inline-block text-sm font-medium text-indigo-600">
          Ir a check-in diario
        </Link>
      </div>
    </div>
  )
}
