"use client"

import { motion } from "framer-motion"
import { Check, RefreshCw, ShoppingCart, Sparkles } from "lucide-react"
import { useMemo, useState } from "react"
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"

export type NutritionPlanView = {
  available: boolean
  kcalTarget: number
  protein: number
  carbs: number
  fats: number
}

type PrepItem = { id: string; label: string; minutes: number; done: boolean }

type Props = {
  plan: NutritionPlanView
  nutritionStatusLabel: string
  onRegenerateIa?: () => void
  onScrollMealPlan?: () => void
}

const MOCK_WEEK_KCAL = [
  { day: "L", kcal: 2480 },
  { day: "M", kcal: 2520 },
  { day: "X", kcal: 2650 },
  { day: "J", kcal: 2620 },
  { day: "V", kcal: 2700 },
  { day: "S", kcal: 2780 },
  { day: "D", kcal: 2550 },
]

const DEFAULT_PREP: PrepItem[] = [
  { id: "1", label: "Proteínas cocidas (pollo + res)", minutes: 45, done: false },
  { id: "2", label: "Arroz / carbos en batch", minutes: 25, done: false },
  { id: "3", label: "Verduras lavadas y troceadas", minutes: 20, done: false },
]

export function WeeklyMealPlan({ plan, nutritionStatusLabel, onRegenerateIa, onScrollMealPlan }: Props) {
  const [prep, setPrep] = useState(DEFAULT_PREP)

  const targets = useMemo(() => {
    if (plan.available && plan.kcalTarget > 0) {
      return {
        kcal: plan.kcalTarget,
        p: plan.protein || 180,
        c: plan.carbs || 260,
        f: plan.fats || 70,
      }
    }
    return { kcal: 2650, p: 185, c: 260, f: 68 }
  }, [plan])

  const macroBars = [
    { key: "Proteína", current: targets.p, goal: 200, color: "bg-slate-900" },
    { key: "Carbos", current: targets.c, goal: 300, color: "bg-blue-500" },
    { key: "Grasas", current: targets.f, goal: 85, color: "bg-slate-400" },
  ] as const

  const chartData = useMemo(() => {
    if (plan.available) return MOCK_WEEK_KCAL
    return MOCK_WEEK_KCAL
  }, [plan.available])

  const togglePrep = (id: string) => {
    setPrep((rows) => rows.map((r) => (r.id === id ? { ...r, done: !r.done } : r)))
  }

  return (
    <motion.div
      id="plan-nutricion"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.08 }}
      className="flex h-full flex-col gap-5 rounded-[32px] border border-slate-200 bg-white p-6 shadow-sm"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="m-0 text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-400">IA Nutrition Engine</p>
          <h2 className="m-0 mt-1 text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">Plan alimenticio semanal</h2>
          <p className="m-0 mt-1 text-sm text-slate-500">Macros alineados a hipertrofia magra · 76 kg · ~12% grasa (referencia)</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={onRegenerateIa}
            className="inline-flex min-h-10 items-center justify-center gap-2 rounded-2xl bg-slate-900 px-4 text-xs font-semibold uppercase tracking-wider text-white shadow-sm transition hover:bg-slate-800"
          >
            <RefreshCw className="h-3.5 w-3.5" aria-hidden />
            Regenerar IA
          </button>
        </div>
      </div>

      <div className="rounded-2xl bg-slate-900 px-4 py-3 text-sm leading-snug text-slate-100 shadow-inner">
        <span className="font-semibold text-blue-300">Estado nutrición:</span> {nutritionStatusLabel}. Objetivo táctico{" "}
        <span className="font-semibold tabular-nums">{targets.kcal} kcal</span>/día para sostener volumen sin exceso.
      </div>

      <div className="rounded-2xl border border-slate-100 bg-slate-50/80 p-4">
        <div className="flex items-center justify-between gap-2">
          <p className="m-0 text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-400">Distribución semanal (kcal)</p>
          <Sparkles className="h-4 w-4 text-blue-500" aria-hidden />
        </div>
        <div className="mt-3 h-[120px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 4, right: 4, left: -24, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
              <XAxis dataKey="day" tick={{ fontSize: 11, fill: "#64748b" }} axisLine={false} tickLine={false} />
              <YAxis hide />
              <Tooltip
                cursor={{ fill: "rgba(148,163,184,0.12)" }}
                contentStyle={{ borderRadius: 14, border: "1px solid #e2e8f0", fontSize: 12 }}
                formatter={(value) => {
                  const v = typeof value === "number" ? value : Number(value)
                  return [`${v} kcal`, ""]
                }}
              />
              <Bar dataKey="kcal" fill="#3b82f6" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="space-y-3">
        <p className="m-0 text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-400">Macros vs objetivo</p>
        {macroBars.map((row) => {
          const pct = Math.min(100, Math.round((row.current / row.goal) * 100))
          return (
            <div key={row.key}>
              <div className="flex items-baseline justify-between gap-2">
                <p className="m-0 text-xs font-semibold text-slate-700">{row.key}</p>
                <p className="m-0 text-xs tabular-nums text-slate-500">
                  <span className="font-semibold text-slate-900">{row.current}g</span> / {row.goal}g
                </p>
              </div>
              <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-slate-100">
                <div className={`h-full rounded-full ${row.color}`} style={{ width: `${pct}%` }} />
              </div>
            </div>
          )
        })}
      </div>

      <div>
        <p className="m-0 text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-400">Meal prep stack</p>
        <ul className="mt-2 space-y-2">
          {prep.map((item) => (
            <li key={item.id}>
              <button
                type="button"
                onClick={() => togglePrep(item.id)}
                className="flex w-full items-center gap-3 rounded-2xl border border-slate-200 bg-white px-3 py-2.5 text-left text-sm text-slate-800 shadow-sm transition hover:border-slate-300 hover:shadow-md"
              >
                <span
                  className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border ${
                    item.done ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-slate-200 bg-slate-50 text-slate-400"
                  }`}
                >
                  <Check className="h-4 w-4" aria-hidden />
                </span>
                <span className="min-w-0 flex-1 font-medium">{item.label}</span>
                <span className="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-600">
                  {item.minutes} min
                </span>
              </button>
            </li>
          ))}
        </ul>
      </div>

      <div className="mt-auto flex flex-col gap-2 sm:flex-row">
        <button
          type="button"
          onClick={onScrollMealPlan}
          className="inline-flex min-h-11 flex-1 items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-900 shadow-sm transition hover:bg-slate-50"
        >
          Ver meal plan
        </button>
        <button
          type="button"
          className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-2xl bg-slate-900 px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800"
        >
          <ShoppingCart className="h-4 w-4" aria-hidden />
          Exportar shopping list
        </button>
      </div>
    </motion.div>
  )
}
