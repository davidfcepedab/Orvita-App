"use client"

import { useId } from "react"
import { Activity, TrendingUp, Zap } from "lucide-react"

import { Card } from "@/src/components/ui/Card"
import type { OrbitaHomeModel } from "@/app/home/_lib/orbita-home-types"

function formatCompactMoneyCOP(n: number) {
  const sign = n < 0 ? "−" : ""
  const v = Math.abs(n)
  if (v >= 1e9) return `${sign}$${(v / 1e9).toFixed(1)}B`
  if (v >= 1e6) return `${sign}$${(v / 1e6).toFixed(1)}M`
  if (v >= 1e3) return `${sign}$${(v / 1e3).toFixed(1)}K`
  return `${sign}$${Math.round(v)}`
}

function flowMomentumLine(money: OrbitaHomeModel["capital"]["money"]): { text: string; className: string } {
  const { netMonthlyCOP, financialPressurePct } = money
  if (netMonthlyCOP > 0) {
    const pct = Math.min(28, Math.max(6, Math.round(14 + (100 - financialPressurePct) * 0.12)))
    return { text: `+${pct}% flujo mensual`, className: "text-emerald-600 dark:text-emerald-400" }
  }
  if (netMonthlyCOP === 0) {
    return { text: "Flujo mensual en equilibrio", className: "text-[var(--color-text-secondary)]" }
  }
  return {
    text: `Presión ${financialPressurePct}% · prioriza liquidez`,
    className: "text-amber-700 dark:text-amber-400",
  }
}

function EnergyRing({ value }: { value: number }) {
  const gid = useId()
  const gradId = `energy-grad-${gid.replace(/:/g, "")}`
  const size = 120
  const stroke = 9
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  const pct = Math.max(0, Math.min(100, Math.round(value)))
  const offset = c - (pct / 100) * c
  const cx = size / 2
  const cy = size / 2

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      className="shrink-0"
      aria-hidden
    >
      <defs>
        <linearGradient id={gradId} x1="0%" y1="100%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="rgb(59, 130, 246)" />
          <stop offset="55%" stopColor="rgb(34, 211, 238)" />
          <stop offset="100%" stopColor="rgb(45, 212, 191)" />
        </linearGradient>
      </defs>
      <circle
        cx={cx}
        cy={cy}
        r={r}
        fill="none"
        stroke="color-mix(in srgb, var(--color-border) 65%, transparent)"
        strokeWidth={stroke}
      />
      <circle
        cx={cx}
        cy={cy}
        r={r}
        fill="none"
        stroke={`url(#${gradId})`}
        strokeWidth={stroke}
        strokeLinecap="round"
        strokeDasharray={c}
        strokeDashoffset={offset}
        transform={`rotate(-90 ${cx} ${cy})`}
      />
      <text
        x={cx}
        y={cy}
        textAnchor="middle"
        dominantBaseline="central"
        className="fill-[var(--color-text-primary)] text-[1.35rem] font-bold tabular-nums tracking-tight"
        style={{ fontFamily: "var(--font-display)" }}
      >
        {pct}%
      </text>
    </svg>
  )
}

type HeroOperativoWidgetProps = {
  model: OrbitaHomeModel
}

export function HeroOperativoWidget({ model }: HeroOperativoWidgetProps) {
  const { money, energy } = model.capital
  const decision = model.widgets.decisions[0]
  const smart = model.smartActions[0]
  const taskTitle = decision?.title ?? smart?.title ?? "Define tu siguiente cierre de alto impacto"
  const impactLabel =
    decision?.pressure === "alta"
      ? "Alto impacto · Hoy"
      : decision
        ? "Prioridad · Hoy"
        : "Siguiente acción · Hoy"

  const flow = flowMomentumLine(money)

  return (
    <section
      id="inicio-capital"
      className="mx-auto max-w-6xl px-4"
      aria-label="Capital operativo y energía"
    >
      <Card className="relative overflow-hidden border-[color-mix(in_srgb,var(--color-border)_75%,transparent)] p-5 shadow-[var(--shadow-card)] sm:p-6">
        <div
          className="pointer-events-none absolute -right-8 -top-10 h-36 w-36 rounded-full opacity-90 blur-2xl"
          style={{
            background:
              "radial-gradient(circle at 30% 30%, rgba(190, 242, 100, 0.45), rgba(253, 224, 71, 0.2) 42%, transparent 68%)",
          }}
        />

        <div className="relative grid gap-8 md:grid-cols-[minmax(0,1fr)_auto] md:items-center md:gap-10">
          <div className="min-w-0 space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <p className="orvita-overline-caps m-0">Capital operativo</p>
              <TrendingUp
                className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400"
                strokeWidth={2.25}
                aria-hidden
              />
            </div>

            <div>
              <p className="orvita-metric-hero m-0 tabular-nums">{formatCompactMoneyCOP(money.netMonthlyCOP)}</p>
              <p className={`mt-1.5 text-sm font-medium ${flow.className}`}>{flow.text}</p>
            </div>

            <div
              className="flex gap-3 rounded-2xl border border-[color-mix(in_srgb,var(--color-border)_65%,transparent)] p-3.5"
              style={{
                background:
                  "color-mix(in srgb, var(--color-surface-alt) 88%, var(--color-background))",
              }}
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-500/12 text-violet-600 dark:text-violet-300">
                <Zap className="h-5 w-5" strokeWidth={2.25} aria-hidden />
              </div>
              <div className="min-w-0">
                <p className="m-0 font-semibold leading-snug text-[var(--color-text-primary)] [text-wrap:pretty]">
                  {taskTitle}
                </p>
                <p className="mt-1 text-xs leading-relaxed text-[var(--color-text-secondary)]">{impactLabel}</p>
              </div>
            </div>
          </div>

          <div className="relative flex flex-col items-center justify-center gap-3 md:min-w-[200px]">
            <EnergyRing value={energy.currentLevelPct} />
            <p className="orvita-overline-caps m-0 text-center">Energía</p>
            <Activity
              className="absolute bottom-0 right-0 h-5 w-5 text-violet-500/90 md:bottom-1 md:right-1"
              strokeWidth={2}
              aria-hidden
            />
          </div>
        </div>
      </Card>
    </section>
  )
}
