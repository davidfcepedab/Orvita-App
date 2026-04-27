"use client"

import { motion } from "framer-motion"
import { Apple, Check, ChevronRight, Dumbbell, Flame, Moon, Printer, RefreshCw, Share2, ShoppingCart, Sun, UtensilsCrossed } from "lucide-react"
import dynamic from "next/dynamic"
import { useEffect, useMemo, useState } from "react"
import type { MealDayDisplay, VisualGoalMode } from "@/lib/training/trainingPrefsTypes"
import { buildConcreteDayMeals } from "@/lib/training/concreteMealSuggestions"
import { buildShoppingListPlainText, openShoppingListPrintWindow, sharePlainText } from "@/lib/training/shoppingListExport"
import { dailyKcalTargetsFromTrainingSchedule, isTrainingDayYmd, weekYmdForMealDayLabel } from "@/lib/training/mealTrainingKcal"
import type { TrainingDay } from "@/src/modules/training/types"

const KcalBarChart = dynamic(() => import("./charts/KcalBarChart").then((m) => m.KcalBarChart), {
  ssr: false,
  loading: () => (
    <div className="flex h-full items-center justify-center text-[10px] text-slate-400">Cargando gráfico…</div>
  ),
})

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
  onExportToast?: (message: string) => void
  /** Días Hevy/manual para marcar entreno vs descanso y ajustar objetivo kcal por día. */
  trainingDays?: TrainingDay[]
  weekAnchorYmd?: string
  /** Objetivo visual (hipertrofia, etc.) — texto corto para contextualizar el plan. */
  visualGoalSummary?: string
  visualGoalMode?: VisualGoalMode
}

function buildPrepRows(plan: NutritionPlanView): PrepRow[] {
  const p = plan.available ? plan.protein : 0
  const c = plan.available ? plan.carbs : 0
  const f = plan.available ? plan.fats : 0
  const k = plan.available ? plan.kcalTarget : 0
  const chickenG = p > 0 ? Math.round((p / 31) * 100) : 0
  const pastaDryG = c > 0 ? Math.round((c / 75) * 100) : 0
  const riceCookedG = c > 0 ? Math.round(c * 1.2) : 0
  const nutsG = f > 0 ? Math.min(45, Math.round(f * 0.35)) : 0
  const oilTsp = f > 0 ? Math.max(2, Math.min(6, Math.round(f / 4.5))) : 0
  return [
    {
      id: "1",
      title: "Bloque proteico (batch)",
      detail: `Para ~${p || "—"} g proteína/día (${k || "—"} kcal media): cocina ~${chickenG || "—"} g/día pechuga de pollo/pavo (crudo) o mezcla con lomo de cerdo magro/res; divide en 3–4 táperes, etiqueta fecha. Opción rápida: latas de atún/sardina para 1–2 comidas. Sal y especias al gusto; evita salsas azucaradas si buscas control calórico.`,
      minutes: 45,
      done: false,
    },
    {
      id: "2",
      title: "Carbohidratos de la semana",
      detail: `Tu plan pide ~${c || "—"} g CHO/día: prepara arroz basmati (~${riceCookedG || "—"} g cocidos por día como referencia) o pasta integral seca ~${pastaDryG || "—"} g/día en crudo; cuece en batch, enfría en bandeja y reparte. Ajusta al alza en días con entreno marcado en el calendario.`,
      minutes: 25,
      done: false,
    },
    {
      id: "3",
      title: "Fibra y volumen (ensalada base)",
      detail:
        "Lava y seca 2–3 tipos de lechuga, tomate cherry, pepino, pimiento; guarda en herméticos con papel absorbente. Añade en cada comida 2 tazas para saciedad sin disparar kcal. Prepara también verduras asadas (calabacín, berenjena) para acompañar proteína.",
      minutes: 20,
      done: false,
    },
    {
      id: "4",
      title: "Grasas medidas",
      detail: `Objetivo ~${f || "—"} g grasa/día: aceite de oliva (~${oilTsp || "—"} cditas/día repartidas en comidas), aguacate en porciones, y ~${nutsG || "—"} g frutos secos en snack (pésalos: 15 g ≈ un puño pequeño).`,
      minutes: 10,
      done: false,
    },
  ]
}

function mealIcon(kind: "sun" | "utensils" | "apple" | "moon") {
  const cls = "h-4 w-4 shrink-0 text-slate-500"
  if (kind === "sun") return <Sun className={cls} aria-hidden />
  if (kind === "utensils") return <UtensilsCrossed className={cls} aria-hidden />
  if (kind === "apple") return <Apple className={cls} aria-hidden />
  return <Moon className={cls} aria-hidden />
}

export function WeeklyMealPlan({
  plan,
  mealDays,
  nutritionStatusLabel,
  onRegenerateIa,
  onExportToast,
  trainingDays = [],
  weekAnchorYmd = "",
  visualGoalSummary,
  visualGoalMode,
}: Props) {
  const [prep, setPrep] = useState<PrepRow[]>(() => buildPrepRows(plan))
  const [selectedDayIdx, setSelectedDayIdx] = useState(0)

  useEffect(() => {
    setPrep(buildPrepRows(plan))
  }, [plan])

  useEffect(() => {
    if (selectedDayIdx >= mealDays.length) setSelectedDayIdx(0)
  }, [mealDays.length, selectedDayIdx])

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

  const dailyTargets = useMemo(() => {
    if (!mealDays.length || targets.kcal <= 0 || !weekAnchorYmd) {
      return mealDays.map(() => targets.kcal)
    }
    return dailyKcalTargetsFromTrainingSchedule({
      mealDayLabels: mealDays.map((m) => m.day),
      baseKcalAvg: targets.kcal,
      trainingDays,
      anchorYmd: weekAnchorYmd,
    })
  }, [mealDays, targets.kcal, trainingDays, weekAnchorYmd])

  const chartData = useMemo(() => {
    if (!mealDays.length) return [] as { day: string; kcal: number; targetKcal: number }[]
    return mealDays.map((d, i) => ({
      day: d.day.length <= 3 ? d.day : d.day.slice(0, 3),
      kcal: d.kcal,
      targetKcal: dailyTargets[i] ?? targets.kcal,
    }))
  }, [mealDays, dailyTargets, targets.kcal])

  const kcalTargetBar =
    dailyTargets.length > 0
      ? Math.round(dailyTargets.reduce((s, x) => s + x, 0) / dailyTargets.length)
      : targets.kcal > 0
        ? targets.kcal
        : chartData.length
          ? Math.round(chartData.reduce((s, x) => s + x.kcal, 0) / chartData.length)
          : 0

  const togglePrep = (id: string) => {
    setPrep((rows) => rows.map((r) => (r.id === id ? { ...r, done: !r.done } : r)))
  }

  const prepMinutesTotal = prep.reduce((s, r) => s + r.minutes, 0)

  const shoppingListPlainText = () =>
    buildShoppingListPlainText({
      targets: { kcal: targets.kcal, p: targets.p, c: targets.c, f: targets.f },
      prep: prep.map((r) => ({ title: r.title, detail: r.detail, minutes: r.minutes })),
    })

  const exportList = async () => {
    const text = shoppingListPlainText()
    try {
      await navigator.clipboard.writeText(text)
      onExportToast?.("Lista copiada al portapapeles.")
    } catch {
      onExportToast?.("No se pudo copiar; selecciona el texto manualmente.")
    }
  }

  const printList = () => {
    openShoppingListPrintWindow(shoppingListPlainText())
    onExportToast?.("Se abrió la ventana de impresión (puedes guardar como PDF).")
  }

  const shareList = async () => {
    const text = shoppingListPlainText()
    const ok = await sharePlainText(text, "Lista compra · Órvita")
    if (ok) onExportToast?.("Compartido.")
    else await exportList()
  }

  const ringPct = useMemo(() => {
    if (!plan.available) return 0
    const pct = (cur: number, goal: number) => (goal > 0 ? Math.min(100, Math.round((cur / goal) * 100)) : 0)
    const p = pct(targets.p, macroGoals.p)
    const c = pct(targets.c, macroGoals.c)
    const f = pct(targets.f, macroGoals.f)
    return Math.round((p + c + f) / 3)
  }, [plan.available, targets, macroGoals])

  const selectedDay = mealDays[selectedDayIdx]
  const selectedTargetKcal = selectedDay ? (dailyTargets[selectedDayIdx] ?? targets.kcal) : 0
  const dayTrain =
    weekAnchorYmd && selectedDay ? isTrainingDayYmd(trainingDays, weekYmdForMealDayLabel(weekAnchorYmd, selectedDay.day) ?? "") : false

  const suggestedMeals = selectedDay
    ? (() => {
        const kcalT = selectedTargetKcal > 0 ? selectedTargetKcal : targets.kcal
        const baseKcal = selectedDay.kcal > 0 ? selectedDay.kcal : targets.kcal > 0 ? targets.kcal : kcalT
        const scale = baseKcal > 0 && kcalT > 0 ? kcalT / baseKcal : 1
        const pro = selectedDay.kcal > 0 ? Math.round(selectedDay.pro * scale) : targets.p
        const carb = selectedDay.kcal > 0 ? Math.round(selectedDay.carb * scale) : targets.c
        const fat = selectedDay.kcal > 0 ? Math.round(selectedDay.fat * scale) : targets.f
        return buildConcreteDayMeals({
          dayKcal: kcalT,
          dayProtein: pro,
          dayCarb: carb,
          dayFat: fat,
          isTrainingDay: dayTrain,
          goalMode: visualGoalMode,
        })
      })()
    : []

  return (
    <motion.div
      id="plan-nutricion"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.06 }}
      className="flex h-full flex-col gap-4 rounded-[40px] border border-slate-200/90 bg-white p-5 shadow-sm sm:p-6"
    >
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 pb-4">
        <div className="min-w-0 flex-1">
          <p className="m-0 text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-400">Fueling sync · Macro-Cloud</p>
          <h2 className="m-0 mt-1 text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">Plan alimenticio semanal</h2>
          <p className="m-0 mt-1 max-w-none text-xs leading-relaxed text-slate-500 text-pretty sm:whitespace-normal">
            Basado en tus días registrados{plan.available ? ` (${mealDays.length} días)` : ""}. Ajusta en preferencias si tu objetivo cambia.
            {visualGoalSummary ? ` Objetivo: ${visualGoalSummary}.` : ""}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-3">
          <div
            className="relative flex h-14 w-14 flex-col items-center justify-center rounded-full border border-blue-200/80 bg-white shadow-[0_0_20px_rgba(59,130,246,0.18)]"
            title="Promedio de cumplimiento de proteína, carbos y grasas respecto al objetivo guardado en preferencias (no es adherencia al día)."
          >
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
            <span className="absolute text-[10px] font-bold leading-none text-slate-800">{ringPct}%</span>
            <span className="sr-only">
              Alineación de macros: aproximadamente {ringPct} por ciento de cumplimiento medio de proteína, carbohidratos y grasas frente al
              objetivo del plan.
            </span>
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
      <p className="m-0 -mt-2 text-[10px] text-slate-400">Anillo: alineación P/C/G vs objetivo del plan guardado.</p>

      <div className="rounded-2xl border border-slate-100 bg-slate-50/90 px-3 py-2.5 text-sm leading-snug text-slate-700">
        <span className="font-medium text-slate-900">Nutrición:</span> {nutritionStatusLabel}
        {plan.available ? (
          <>
            {" "}
            · <span className="font-semibold tabular-nums">{targets.kcal} kcal</span>/día es la{" "}
            <span className="font-medium">media de tus registros</span> en preferencias. Los objetivos por día (gráfico y vista diaria) se{" "}
            <span className="font-medium">ajustan arriba o abajo</span> según si ese día hay entreno registrado (Hevy/manual) en tu semana.
          </>
        ) : (
          " · Registra comidas en el plan para calcular objetivos."
        )}
      </div>

      {mealDays.length > 0 ? (
        <div className="rounded-2xl border border-slate-100 bg-white p-3 shadow-sm">
          <p className="m-0 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">Vista por día</p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {mealDays.map((d, i) => {
              const ymd = weekAnchorYmd ? weekYmdForMealDayLabel(weekAnchorYmd, d.day) : null
              const train = ymd ? isTrainingDayYmd(trainingDays, ymd) : false
              const active = i === selectedDayIdx
              return (
                <button
                  key={`${d.day}-${i}`}
                  type="button"
                  onClick={() => setSelectedDayIdx(i)}
                  className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold transition ${
                    active
                      ? "border-slate-900 bg-slate-900 text-white"
                      : "border-slate-200 bg-slate-50 text-slate-700 hover:border-slate-300"
                  }`}
                >
                  {train ? <Dumbbell className="h-3 w-3 opacity-90" aria-hidden /> : <span className="text-[9px] opacity-80">REST</span>}
                  {d.day}
                </button>
              )
            })}
          </div>
          {selectedDay ? (
            <div className="mt-3 rounded-xl border border-slate-100 bg-slate-50/80 p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="m-0 text-[10px] font-semibold uppercase tracking-wide text-blue-600">
                    {dayTrain ? "Día con entreno" : "Día ligero / descanso"}
                  </p>
                  <p className="m-0 text-lg font-bold tabular-nums text-slate-900">{selectedTargetKcal} kcal objetivo</p>
                  <p className="m-0 text-[11px] text-slate-500">
                    Registrado: {selectedDay.kcal} kcal · P{selectedDay.pro} · C{selectedDay.carb} · G{selectedDay.fat}
                  </p>
                </div>
              </div>
              <ul className="m-0 mt-3 list-none space-y-3 p-0">
                {suggestedMeals.map((m) => (
                  <li
                    key={m.time + m.label}
                    className="flex items-start gap-3 rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm shadow-sm"
                  >
                    <span className="mt-0.5 text-slate-400">{mealIcon(m.icon)}</span>
                    <div className="min-w-0 flex-1">
                      <p className="m-0 font-semibold text-slate-900">
                        <span className="tabular-nums text-slate-500">{m.time}</span> · {m.label}
                      </p>
                      <p className="m-0 mt-1 text-xs font-medium tabular-nums text-slate-600">
                        ~{m.kcal} kcal · {m.proteinG} g P · {m.carbG} g CHO · {m.fatG} g G
                      </p>
                      <p className="m-0 mt-1.5 text-xs leading-relaxed text-slate-700 text-pretty">{m.detail}</p>
                    </div>
                  </li>
                ))}
              </ul>
              <p className="m-0 mt-2 text-[10px] leading-snug text-slate-400">
                Horarios y nombres son una guía; reparte tus macros reales como prefieras.
              </p>
            </div>
          ) : null}
        </div>
      ) : null}

      <div className="rounded-2xl border border-slate-100 bg-slate-50/60 p-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 text-slate-500">
            <Flame className="h-3.5 w-3.5 text-orange-400" aria-hidden />
            <p className="m-0 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">Kcal por día</p>
          </div>
          {kcalTargetBar > 0 ? (
            <span className="max-w-[55%] text-right text-[10px] font-semibold uppercase tracking-wide text-blue-600">
              Media obj. ~{kcalTargetBar} kcal (línea)
            </span>
          ) : null}
        </div>
        <div className="mt-2 h-[132px]">
          {chartData.length ? (
            <KcalBarChart chartData={chartData} kcalTargetBar={kcalTargetBar} />
          ) : (
            <p className="m-0 flex h-full items-center justify-center text-center text-xs text-slate-500">
              Sin días de comida registrados. Completa el meal plan en preferencias para ver barras reales.
            </p>
          )}
        </div>
      </div>

      <div className="space-y-2.5">
        <p className="m-0 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">Macros vs objetivo (media del plan)</p>
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
          <p className="m-0 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">Meal prep stack · semana</p>
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

      <div className="mt-auto flex flex-col gap-2 border-t border-slate-100 pt-3">
        <button
          type="button"
          onClick={() => void exportList()}
          className="inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-full bg-slate-900 px-4 text-xs font-semibold text-white transition hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
        >
          <ShoppingCart className="h-3.5 w-3.5" aria-hidden />
          Lista compra
          <ChevronRight className="h-3.5 w-3.5 opacity-80" aria-hidden />
        </button>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={printList}
            className="inline-flex min-h-9 flex-1 items-center justify-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 text-[11px] font-medium text-slate-700 transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:ring-offset-2 sm:flex-none"
          >
            <Printer className="h-3.5 w-3.5" aria-hidden />
            Imprimir / PDF
          </button>
          <button
            type="button"
            onClick={() => void shareList()}
            className="inline-flex min-h-9 flex-1 items-center justify-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 text-[11px] font-medium text-slate-700 transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:ring-offset-2 sm:flex-none"
          >
            <Share2 className="h-3.5 w-3.5" aria-hidden />
            Compartir
          </button>
        </div>
      </div>
    </motion.div>
  )
}
