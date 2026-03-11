"use client"

import { useEffect, useState } from "react"
import { useFinance } from "../FinanceContext"
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts"
import { useRouter } from "next/navigation"

export default function FinanzasCategories() {
  const { month } = useFinance()
  const router = useRouter()
  const [data, setData] = useState<any>(null)
  const [expanded, setExpanded] = useState<string | null>(null)

  useEffect(() => {
    if (!month) return

    fetch(`/api/finanzas/categories?month=${month}`)
      .then((res) => res.json())
      .then(setData)
  }, [month])

  if (!data) return null

  const {
    structuralCategories = [],
    totalFixed = 0,
    totalVariable = 0,
  } = data

  const formatMoney = (value: number) =>
    new Intl.NumberFormat("es-CO", {
      maximumFractionDigits: 0,
    }).format(Math.abs(value || 0))

  const absFixed = Math.abs(totalFixed)
  const absVariable = Math.abs(totalVariable)
  const structuralTotal = absFixed + absVariable

  const fixedCategories = structuralCategories
    .filter((c: any) => c.type === "fixed")
    .sort((a: any, b: any) =>
      Math.abs(b.total) - Math.abs(a.total)
    )

  const variableCategories = structuralCategories
    .filter((c: any) => c.type === "variable")
    .sort((a: any, b: any) =>
      Math.abs(b.total) - Math.abs(a.total)
    )

  const fixedPct =
    structuralTotal > 0
      ? Math.round((absFixed / structuralTotal) * 100)
      : 0

  const variablePct =
    structuralTotal > 0
      ? 100 - fixedPct
      : 0

  // =========================
  // ÍNDICE RIGIDEZ ESTRUCTURAL
  // =========================
  const rigidez = fixedPct

  const rigidezColor =
    rigidez > 75
      ? "text-rose-500"
      : rigidez > 60
      ? "text-amber-500"
      : "text-emerald-600"

  // =========================
  // ÍNDICE PRESIÓN PRESUPUESTAL
  // =========================
  const budgetValues = structuralCategories
    .filter((c: any) => c.budget > 0)
    .map((c: any) => c.budgetUsedPercent)

  const avgBudget =
    budgetValues.length > 0
      ? budgetValues.reduce(
          (a: number, b: number) => a + b,
          0
        ) / budgetValues.length
      : 0

  const presionEstado =
    avgBudget > 100
      ? "Crítica"
      : avgBudget > 80
      ? "Tensión"
      : "Saludable"

  const presionColor =
    avgBudget > 100
      ? "text-rose-500"
      : avgBudget > 80
      ? "text-amber-500"
      : "text-emerald-600"

  const donutData = [
    { name: "Fijos", value: absFixed },
    { name: "Variables", value: absVariable },
  ]

  const handleClickCategory = (name: string) => {
    setExpanded(expanded === name ? null : name)
  }

  return (
    <div className="space-y-8">


{/* HEATMAP 6 MESES */}
<div className="card p-6">
  <h3 className="text-sm text-gray-500 mb-4">
    Intensidad estructural 6 meses
  </h3>

  <div className="space-y-3">
    {data.heatmap6m?.map((row: any) => (
      <div key={row.name} className="flex items-center gap-3">

        <div className="w-28 text-xs text-gray-600">
          {row.name}
        </div>

        <div className="flex gap-1 flex-1">
          {row.months.map((m: any) => {
            let bg = "bg-emerald-200"

            if (m.percent > 100) bg = "bg-red-300"
            else if (m.percent > 80) bg = "bg-yellow-300"

            return (
              <div
                key={m.month}
                className={`h-6 flex-1 rounded ${bg}`}
                title={`${m.month} - ${m.percent}%`}
              />
            )
          })}
        </div>
      </div>
    ))}
  </div>
</div>


      {/* ===== INDICES ESTRATÉGICOS ===== */}
      <div className="card p-4 text-sm space-y-2">
        <div className="flex justify-between">
          <span>Rigidez estructural</span>
          <span className={rigidezColor}>
            {rigidez}% 
          </span>
        </div>

        <div className="flex justify-between">
          <span>Presión presupuestal</span>
          <span className={presionColor}>
            {presionEstado} ({avgBudget.toFixed(0)}%)
          </span>
        </div>
      </div>

      {/* ===== TOTALES ===== */}
      <div className="grid grid-cols-2 gap-4">
        <div className="card p-6 text-center">
          <p className="text-sm text-gray-500">Fijos</p>
          <p className="text-2xl font-semibold text-rose-400 mt-2">
            -${formatMoney(totalFixed)}
          </p>
        </div>

        <div className="card p-6 text-center">
          <p className="text-sm text-gray-500">Variables</p>
          <p className="text-2xl font-semibold text-emerald-600 mt-2">
            -${formatMoney(totalVariable)}
          </p>
        </div>
      </div>

      {/* ===== DONUT ===== */}
      <div className="card p-6">
        <ResponsiveContainer width="100%" height={260}>
          <PieChart>
            <Pie
              data={donutData}
              dataKey="value"
              innerRadius={70}
              outerRadius={100}
            >
              <Cell fill="#FDA4AF" />
              <Cell fill="#16A34A" />
            </Pie>
          </PieChart>
        </ResponsiveContainer>

        <div className="flex justify-between mt-4 text-lg font-semibold">
          <div className="text-rose-400">
            Fijos {fixedPct}%
          </div>
          <div className="text-emerald-600">
            Variables {variablePct}%
          </div>
        </div>
      </div>

      {/* ===== SECCIONES ===== */}
      {[{
        title: "Movimientos Fijos",
        items: fixedCategories,
        clusterBase: absFixed,
        barColor: "bg-rose-300"
      },
      {
        title: "Movimientos Variables",
        items: variableCategories,
        clusterBase: absVariable,
        barColor: "bg-emerald-500"
      }].map((section) => (
        <div key={section.title} className="space-y-4">

          <h2 className="text-xl font-semibold">
            {section.title}
          </h2>

          {section.items.map((cat: any) => {

            const percent =
              section.clusterBase > 0
                ? (Math.abs(cat.total) /
                    section.clusterBase) *
                  100
                : 0

            const delta = cat.deltaCluster ?? 0
            const budgetUsed =
              cat.budgetUsedPercent ?? 0

            const exceso =
              cat.budget > 0
                ? Math.abs(cat.total) -
                  cat.budget
                : 0

            const insight =
              percent > 60
                ? `Concentra ${percent.toFixed(
                    0
                  )}% del cluster`
                : null

            return (
              <div
                key={cat.name}
                className="card p-4 transition"
              >
                <div
                  className="flex justify-between cursor-pointer"
                  onClick={() =>
                    handleClickCategory(cat.name)
                  }
                >
                  <p className="font-medium">
                    {cat.name}
                  </p>
                  <p className="font-semibold">
                    -${formatMoney(cat.total)}
                  </p>
                </div>

                {/* CLUSTER BAR */}
                <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                  <div
                    className={`h-2 rounded-full ${section.barColor}`}
                    style={{
                      width: `${percent}%`,
                    }}
                  />
                </div>

                <div className="flex justify-between text-xs mt-2">
                  <span>
                    {percent.toFixed(
                      1
                    )}% del cluster
                  </span>

                  <span
                    className={
                      delta > 0
                        ? "text-rose-400"
                        : "text-emerald-600"
                    }
                  >
                    {delta > 0 ? "↑" : "↓"}{" "}
                    {Math.abs(
                      delta
                    ).toFixed(1)}% vs mes anterior
                  </span>
                </div>

                {/* PRESUPUESTO HÍBRIDO */}
                {cat.budget > 0 && (
                  <div className="mt-3 text-xs text-gray-500">
                    Presupuesto: $
                    {formatMoney(cat.budget)}{" "}
                    ({exceso > 0
                      ? `+${formatMoney(
                          exceso
                        )}`
                      : "OK"})
                    <div>
                      {budgetUsed.toFixed(
                        0
                      )}% usado
                    </div>
                  </div>
                )}

                {/* INSIGHT */}
                {insight && (
                  <div className="mt-2 text-xs text-gray-400">
                    {insight}
                  </div>
                )}

                {/* SUBCATEGORÍAS EXPANDIBLES */}
                {expanded === cat.name &&
                  cat.subcategories?.length >
                    0 && (
                    <div className="mt-3 space-y-2">
                      {cat.subcategories
                        .sort(
                          (a: any, b: any) =>
                            Math.abs(b.total) -
                            Math.abs(a.total)
                        )
                        .map((sub: any) => {

                          const subPct =
                            Math.abs(sub.total) /
                            Math.abs(cat.total) *
                            100

                          return (
                            <div
                              key={sub.name}
                              className="text-xs"
                            >
                              <div className="flex justify-between text-gray-500">
                                <span>
                                  • {sub.name}
                                </span>
                                <span>
                                  -$
                                  {formatMoney(
                                    sub.total
                                  )}
                                </span>
                              </div>

                              <div className="w-full bg-gray-200 rounded-full h-1 mt-1">
                                <div
                                  className="bg-gray-400 h-1 rounded-full"
                                  style={{
                                    width: `${subPct}%`,
                                  }}
                                />
                              </div>
                            </div>
                          )
                        })}
                    </div>
                  )}

              </div>
            )
          })}
        </div>
      ))}

    </div>
  )
}
