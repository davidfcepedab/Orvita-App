"use client"

import { motion } from "framer-motion"
import { Check, ChevronRight, Flame, RefreshCw, ShoppingCart } from "lucide-react"
import { useEffect, useMemo, useState } from "react"
import type { MealDayDisplay } from "@/lib/training/trainingPrefsTypes"
import { Bar, BarChart, CartesianGrid, Cell, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"

export type NutritionPlanView = {
  available: boolean
  kcalTarget: number
  protein: number
  carbs: number
  fats: number
}

type PrepRow = { id: string; title: string; detail: string; minutes: number; done: boolean }

type Props = {
  plan: NutritionPlanView
  mealDays: MealDayDisplay[]
  nutritionStatusLabel: string
  onRegenerateIa?: () => void
  onScrollMealPlan?: () => void
  onExportToast?: (message: string) => void
}

function buildPrepRows(plan: NutritionPlanView): PrepRow[] {
  const p = plan.available ? plan.protein : 0
  const c = plan.available ? plan.carbs : 0
  const f = plan.available ? plan.fats : 0
  const k = plan.available ? plan.kcalTarget : 0
  return [
    {
      id: "1",
      title: "Proteínas cocidas",
      detail: `Objetivo ~${p || "—"}g proteína/día: 1,0–1,4 kg pollo/pavo o mezcla con res magra; sal en moderación; porcionar y congelar.`,
      minutes: 45,
      done: false,
    },
    {
      id: "2",
      title: "Carbos en batch",
      detail: `Arroz basmati o pasta integral para ~${c || "—"}g carbos/día según tu plan registrado (${k || "—"} kcal/día media).`,
      minutes: 25,
      done: false,
    },
    {
      id: "3",
      title: "Verduras y ensalada base",
      detail: "Lavar, secar y trocear mix de lechuga, tomate, pepino y pimientos; guardar en herméticos para 3–4 días.",
      minutes: 20,
      done: false,
    },
    {
      id: "4",
      title: "Grasas de calidad",
      detail: `Aceite de oliva en spray/bote, frutos secos porcionados (~${f || "—"}g grasa/día como referencia del plan).`,
      minutes: 10,
      done: false,
    },
  ]
}

export function WeeklyMealPlan({ plan, mealDays, nutritionStatusLabel, onRegenerateIa, onScrollMealPlan, onExportToast }: Props) {
  const [prep, setPrep] = useState<PrepRow[]>(() => buildPrepRows(plan))

  useEffect(() => {
    setPrep(buildPrepRows(plan))
  }, [plan])

  const targets = useMemo(() => {
    if (plan.available && plan.kcalTarget > 0) {
      return {
        kcal: plan.kcalTarget,
        p: plan.protein || 180,
        c: plan.carbs || 260,
        f: plan.fats || 70,
      }
    }
    return { kcal: 0, p: 0, c: 0, f: 0 }
  }, [plan])

  const macroGoals = useMemo(
    () => ({
      p: targets.p > 0 ? Math.max(targets.p, 160) : 200,
      c: targets.c > 0 ? Math.max(targets.c, 200) : 300,
      f: targets.f > 0 ? Math.max(targets.f, 60) : 85,
    }),
    [targets],
  )

  const macroBars = [
    { key: "Proteína", current: targets.p || plan.protein, goal: macroGoals.p, color: "bg-slate-900" },
    { key: "Carbos", current: targets.c || plan.carbs, goal: macroGoals.c, color: "bg-blue-500" },
    { key: "Grasas", current: targets.f || plan.fats, goal: macroGoals.f, color: "bg-sky-300" },
  ] as const

  const chartData = useMemo(() => {
    if (!mealDays.length) return [] as { day: string; kcal: number }[]
    return mealDays.map((d) => ({
      day: d.day.length <= 3 ? d.day : d.day.slice(0, 3),
      kcal: d.kcal,
    }))
  }, [mealDays])

  const kcalTargetBar = targets.kcal > 0 ? targets.kcal : chartData.length ? Math.round(chartData.reduce((s, x) => s + x.kcal, 0) / chartData.length) : 0

  const togglePrep = (id: string) => {
    setPrep((rows) => rows.map((r) => (r.id === id ? { ...r, done: !r.done } : r)))
  }

  const prepMinutesTotal = prep.reduce((s, r) => s + r.minutes, 0)

  const exportList = async () => {
    const header = `Lista compra · Órvita\nObjetivo ~${targets.kcal || "—"} kcal/día · P${targets.p || "—"} C${targets.c || "—"} F${targets.f || "—"}\n`
    const body = prep.map((r) => `• ${r.title} (${r.minutes} min)\n  ${r.detail}`).join("\n\n")
    const text = `${header}\n${body}`
    try {
      await navigator.clipboard.writeText(text)
      onExportToast?.("Lista copiada al portapapeles.")
    } catch {
      onExportToast?.("No se pudo copiar; selecciona el texto manualmente.")
    }
  }

  const ringPct = useMemo(() => {
    if (!plan.available) return 0
    const pct = (cur: number, goal: number) => (goal > 0 ? Math.min(100, Math.round((cur / goal) * 100)) : 0)
    const p = pct(targets.p, macroGoals.p)
    const c = pct(targets.c, macroGoals.c)
    const f = pct(targets.f, macroGoals.f)
    return Math.round((p + c + f) / 3)
  }, [plan.available, targets, macroGoals])

  return (
    <motion.div
      id="plan-nutricion"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.06 }}
      className="flex h-full flex-col gap-4 rounded-[40px] border border-slate-200/90 bg-white p-5 shadow-sm sm:p-6"
    >
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 pb-4">
        <div>
          <p className="m-0 text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-400">Fueling sync · Macro-Cloud</p>
          <h2 className="m-0 mt-1 text-xl font-bold italic tracking-tight text-slate-900 sm:text-2xl">Plan alimenticio semanal</h2>
          <p className="m-0 mt-1 max-w-md text-xs leading-relaxed text-slate-500">
            Basado en tus días registrados{plan.available ? ` (${mealDays.length} días)` : ""}. Ajusta en preferencias si tu objetivo cambia.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative flex h-14 w-14 items-center justify-center rounded-full border border-blue-200/80 bg-white shadow-[0_0_20px_rgba(59,130,246,0.18)]">
            <svg className="h-12 w-12 -rotate-90" viewBox="0 0 36 36" aria-hidden>
              <circle cx="18" cy="18" r="15.5" fill="none" stroke="#e2e8f0" strokeWidth="3" />
              <circle
                cx="18"
                cy="18"
                r="15.5"
                fill="none"
                stroke="#3b82f6"
                strokeWidth="3"
                strokeDasharray={`${(ringPct / 100) * 97.4} 97.4`}
                strokeLinecap="round"
              />
            </svg>
            <span className="absolute text-[11px] font-bold text-slate-800">{ringPct}%</span>
          </div>
          <button
            type="button"
            onClick={onRegenerateIa}
            className="inline-flex min-h-9 items-center justify-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 text-[11px] font-medium text-slate-600 shadow-sm transition hover:border-slate-300 hover:text-slate-900"
          >
            <RefreshCw className="h-3.5 w-3.5" aria-hidden />
            IA
          </button>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-100 bg-slate-50/90 px-3 py-2.5 text-sm leading-snug text-slate-700">
        <span className="font-medium text-slate-900">Nutrición:</span> {nutritionStatusLabel}
        {plan.available ? (
          <>
            {" "}
            · Objetivo medio <span className="font-semibold tabular-nums">{targets.kcal} kcal</span>/día (de tus registros).
          </>
        ) : (
          " · Registra comidas en el plan para calcular objetivos."
        )}
      </div>

      <div className="rounded-2xl border border-slate-100 bg-slate-50/60 p-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 text-slate-500">
            <Flame className="h-3.5 w-3.5 text-orange-400" aria-hidden />
            <p className="m-0 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">Kcal por día</p>
          </div>
          {kcalTargetBar > 0 ? (
            <span className="text-[10px] font-semibold uppercase tracking-wide text-blue-600">Obj. {kcalTargetBar} kcal</span>
          ) : null}
        </div>
        <div className="mt-2 h-[132px]">
          {chartData.length ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 16, right: 4, left: -28, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis dataKey="day" tick={{ fontSize: 10, fill: "#64748b" }} axisLine={false} tickLine={false} />
                <YAxis hide />
                {kcalTargetBar > 0 ? <ReferenceLine y={kcalTargetBar} stroke="#3b82f6" strokeDasharray="5 4" strokeWidth={1} /> : null}
                <Tooltip
                  cursor={{ fill: "rgba(148,163,184,0.08)" }}
                  contentStyle={{ borderRadius: 12, border: "1px solid #e2e8f0", fontSize: 11 }}
                  formatter={(value) => {
                    const v = typeof value === "number" ? value : Number(value)
                    return [`${v} kcal`, ""]
                  }}
                />
                <Bar dataKey="kcal" radius={[8, 8, 0, 0]}>
                  {chartData.map((e) => (
                    <Cell key={e.day} fill={kcalTargetBar > 0 && e.kcal >= kcalTargetBar * 0.97 ? "#3b82f6" : "#e2e8f0"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="m-0 flex h-full items-center justify-center text-center text-xs text-slate-500">
              Sin días de comida registrados. Completa el meal plan en preferencias para ver barras reales.
            </p>
          )}
        </div>
      </div>

      <div className="space-y-2.5">
        <p className="m-0 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">Macros vs objetivo</p>
        {macroBars.map((row) => {
          const cur = typeof row.current === "number" ? row.current : 0
          const pct = row.goal > 0 ? Math.min(100, Math.round((cur / row.goal) * 100)) : 0
          return (
            <div key={row.key}>
              <div className="flex items-baseline justify-between gap-2">
                <p className="m-0 text-[11px] font-semibold uppercase tracking-wide text-slate-500">{row.key}</p>
                <p className="m-0 text-[11px] tabular-nums text-slate-500">
                  <span className="font-semibold text-slate-900">{cur}g</span> / {row.goal}g
                </p>
              </div>
              <div className="mt-1 h-2.5 overflow-hidden rounded-full bg-slate-100">
                <motion.div
                  className={`h-full rounded-full ${row.color}`}
                  initial={{ width: 0 }}
                  animate={{ width: `${pct}%` }}
                  transition={{ type: "spring", stiffness: 140, damping: 20 }}
                />
              </div>
            </div>
          )
        })}
      </div>

      <div>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="m-0 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">Meal prep stack</p>
          <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-semibold text-blue-700">
            ~{prepMinutesTotal} min
          </span>
        </div>
        <ul className="mt-2 space-y-2">
          {prep.map((item) => (
            <li key={item.id}>
              <button
                type="button"
                onClick={() => togglePrep(item.id)}
                className="flex w-full items-start gap-3 rounded-2xl border border-slate-200 bg-white px-3 py-2.5 text-left shadow-sm transition hover:border-slate-300"
              >
                <span
                  className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border ${
                    item.done ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-slate-200 bg-slate-50 text-slate-400"
                  }`}
                >
                  <Check className="h-4 w-4" aria-hidden />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-semibold text-slate-900">{item.title}</span>
                  <span className="mt-0.5 block text-[11px] leading-snug text-slate-500">{item.detail}</span>
                </span>
                <span className="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600">{item.minutes} min</span>
              </button>
            </li>
          ))}
        </ul>
      </div>

      <div className="mt-auto flex flex-col gap-2 border-t border-slate-100 pt-3 sm:flex-row">
        <button
          type="button"
          onClick={onScrollMealPlan}
          className="inline-flex min-h-10 flex-1 items-center justify-center rounded-full border border-slate-200 bg-white px-4 text-xs font-medium text-slate-700 transition hover:bg-slate-50"
        >
          Ver detalle
        </button>
        <button
          type="button"
          onClick={() => void exportList()}
          className="inline-flex min-h-10 flex-1 items-center justify-center gap-2 rounded-full bg-slate-900 px-4 text-xs font-semibold text-white transition hover:bg-slate-800"
        >
          <ShoppingCart className="h-3.5 w-3.5" aria-hidden />
          Lista compra
          <ChevronRight className="h-3.5 w-3.5 opacity-80" aria-hidden />
        </button>
      </div>
    </motion.div>
  )
}
