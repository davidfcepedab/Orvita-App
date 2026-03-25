"use client"

import Link from "next/link"
import { useOperationalContext } from "@/app/hooks/useOperationalContext"

export default function Profesional() {
  const { data, loading, error } = useOperationalContext()

  if (loading) {
    return <div className="p-6 text-center text-gray-500">Cargando coach...</div>
  }

  if (error) {
    return <div className="p-6 text-center text-red-600">Error: {error}</div>
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">Profesional</h1>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="card">
          <p className="text-sm text-gray-500">Disciplina</p>
          <p className="text-4xl font-bold">{data?.score_disciplina ?? 0}</p>
        </div>
        <div className="card">
          <p className="text-sm text-gray-500">Score Profesional</p>
          <p className="text-4xl font-bold">{data?.score_profesional ?? 0}</p>
        </div>
      </div>

      <div className="card">
        <p className="text-sm text-gray-500">Tendencia</p>
        <p className="mt-2 text-lg font-semibold">
          {typeof data?.delta_disciplina === "number"
            ? `${data.delta_disciplina > 0 ? "+" : ""}${data.delta_disciplina}%`
            : "Sin datos"}
        </p>
        <p className="mt-3 text-sm text-gray-500">
          Usa finanzas y salud para balancear ejecucion semanal.
        </p>
        <Link href="/agenda" className="mt-4 inline-block text-sm font-medium text-indigo-600">
          Ir a agenda V3
        </Link>
      </div>
    </div>
  )
}
