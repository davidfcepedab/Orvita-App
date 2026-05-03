"use client"

import type { CSSProperties } from "react"
import { type FormEvent, useCallback, useEffect, useMemo, useState } from "react"
import { AlertTriangle, ChevronDown } from "lucide-react"
import { motion, useReducedMotion } from "framer-motion"
import { useFinance } from "../FinanceContext"
import {
  financeCardHintClass,
  financeCardMicroLabelClass,
  financeHeroChipBaseClass,
  financeInlineSegmentRailClass,
  financeModuleContentStackClass,
  financeNoticeChipClass,
  financePlStackClass,
  financeSectionEyebrowClass,
  financeSectionIntroClass,
  financeSubnavTabClass,
} from "../_components/financeChrome"
import { useRouter } from "next/navigation"
import { Card } from "@/src/components/ui/Card"
import { isModuloFinancieroStructuralCategory } from "@/lib/finanzas/structuralOperativoTotals"
import { messageForHttpError } from "@/lib/api/friendlyHttpError"
import {
  FINANCE_GASTO_FIJO,
  FINANCE_GASTO_TOTAL_MAPA,
  FINANCE_GASTO_VARIABLE,
  sheetTipoPillClass,
  sheetTipoPillHexStyle,
} from "@/lib/finanzas/catalogTagStyles"
import { applyClientCategoryBudgets, type CategoryBudgetSource } from "@/lib/finanzas/applyClientCategoryBudgets"
import {
  applyBudgetTemplateFromRemote,
  categoryBudgetKey,
  loadBudgetStore,
  loadMonthBudgets,
  markBudgetRemoteSynced,
  saveMonthBudgets,
  shouldApplyRemotePull,
  subcategoryBudgetKey,
  type MonthCategoryBudgetsV1,
} from "@/lib/finanzas/categoryBudgetStorage"
import { isAppMockMode, isSupabaseEnabled } from "@/lib/checkins/flags"
import { financeApiGet, financeApiJson } from "@/lib/finanzas/financeClientFetch"
import type { RollingSixMonthStat } from "@/lib/finanzas/categoryRollingSixMonth"
import type { FinanceSubcategoryCatalogRow } from "@/lib/finanzas/subcategoryCatalog"
import { CategoryAnalysisPanels } from "./_components/CategoryAnalysisPanels"
import { cn } from "@/lib/utils"

/** Total del mapa: magenta/rosa (gasto agregado). */
const CATEGORY_KPI_TOTAL_STYLE: CSSProperties = {
  background: `linear-gradient(155deg,
    color-mix(in srgb, ${FINANCE_GASTO_TOTAL_MAPA.accent} 22%, var(--color-surface)) 0%,
    var(--color-surface) 48%,
    color-mix(in srgb, ${FINANCE_GASTO_TOTAL_MAPA.accentWarm} 15%, var(--color-surface)) 100%)`,
  borderColor: `color-mix(in srgb, ${FINANCE_GASTO_TOTAL_MAPA.border} 44%, var(--color-border))`,
}

/** Fijo = costo recurrente (ámbar — gama cálida gasto). */
const CATEGORY_KPI_FIJO_STYLE: CSSProperties = {
  background: `linear-gradient(155deg, color-mix(in srgb, ${FINANCE_GASTO_FIJO.accent} 22%, var(--color-surface)) 0%, var(--color-surface) 54%, color-mix(in srgb, ${FINANCE_GASTO_FIJO.wash} 14%, var(--color-surface)) 100%)`,
  borderColor: `color-mix(in srgb, ${FINANCE_GASTO_FIJO.border} 48%, var(--color-border))`,
}

/** Variable = ajuste mensual (naranja). */
const CATEGORY_KPI_VARIABLE_STYLE: CSSProperties = {
  background: `linear-gradient(155deg, color-mix(in srgb, ${FINANCE_GASTO_VARIABLE.accent} 20%, var(--color-surface)) 0%, var(--color-surface) 52%, color-mix(in srgb, ${FINANCE_GASTO_VARIABLE.wash} 13%, var(--color-surface)) 100%)`,
  borderColor: `color-mix(in srgb, ${FINANCE_GASTO_VARIABLE.border} 46%, var(--color-border))`,
}

interface Subcategory {
  name: string
  total: number
  sheetTipo?: "fijo" | "variable" | "modulo_finanzas"
  financialImpact?: string
  budgetable?: boolean
  catalogCategory?: string
  categoryMismatch?: boolean
  /** Presupuesto en COP (solo si el usuario lo definió en «Presupuestos del mes»). */
  budgetCap?: number
  budgetUsedPercent?: number
  budgetStatus?: "green" | "yellow" | "red"
}

interface Category {
  name: string
  type: "fixed" | "variable"
  total: number
  previousTotal?: number
  delta?: number
  budget?: number
  budgetUsedPercent?: number
  budgetStatus?: "green" | "yellow" | "red"
  budgetSource?: CategoryBudgetSource
  subcategories?: Subcategory[]
}

interface CategoriesData {
  structuralCategories?: Category[]
  totalFixed?: number
  totalVariable?: number
  totalStructural?: number
  unknownSubcategories?: string[]
  subcategoryCatalog?: FinanceSubcategoryCatalogRow[]
  /** Rolling 6 meses por `categoryBudgetKey` / `subcategoryBudgetKey`. */
  rollingSixMonthByBudgetKey?: Record<string, RollingSixMonthStat>
}

interface CategoriesResponse {
  success: boolean
  data?: CategoriesData
  error?: string
}

/** Tarjetas KPI del mapa operativo: total sin texto largo; fijo/variable con hint corto. */
type OperativaKpiCardRow =
  | {
      key: "total"
      label: string
      value: number
      cardStyle: CSSProperties
    }
  | {
      key: "fijo" | "variable"
      label: string
      value: number
      hint: string
      cardStyle: CSSProperties
    }

const operativaKpiHintClass = cn(financeCardHintClass, "!mt-0 text-[10px] leading-snug sm:text-[11px]")

/**
 * CTA en summary de details: verde suave, mismo ancho en catálogo y presupuestos.
 */
const financeSummaryGreenButtonClass = cn(
  "inline-flex w-[8.5rem] shrink-0 items-center justify-center rounded-lg border py-1.5 text-[10px] font-semibold uppercase tracking-[0.08em] transition-[background-color,border-color,opacity,transform] sm:w-[9rem] sm:py-2 sm:text-[11px] sm:tracking-[0.09em]",
  "border-[color-mix(in_srgb,var(--color-accent-health)_38%,var(--color-border))]",
  "bg-[color-mix(in_srgb,var(--color-accent-health)_12%,var(--color-surface))]",
  "text-[color-mix(in_srgb,var(--color-accent-health)_88%,var(--color-text-primary))]",
  "hover:bg-[color-mix(in_srgb,var(--color-accent-health)_20%,var(--color-surface))]",
  "active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40",
  "min-h-8 sm:min-h-[34px]",
)

/** Tarjeta base compartida para los dos `<details>` (catálogo + presupuestos): mismo tono y relieve. */
const financeDetailsCardSurfaceStyle: CSSProperties = {
  background:
    "linear-gradient(175deg, color-mix(in srgb, var(--color-surface-alt) 45%, var(--color-surface)) 0%, var(--color-surface) 55%)",
  border: "0.5px solid color-mix(in srgb, var(--color-border) 78%, transparent)",
  boxShadow: "0 2px 18px color-mix(in srgb, var(--color-text-primary) 5%, transparent)",
}

const financeDetailsSummaryClass = cn(
  "flex min-h-[3.75rem] cursor-pointer list-none items-center justify-between gap-2 px-3 py-2.5 sm:min-h-[4rem] sm:gap-3 sm:px-4 sm:py-3 [&::-webkit-details-marker]:hidden",
  "bg-white dark:bg-orbita-surface",
)

const financeDetailsTitleClass = "text-sm font-semibold leading-tight text-orbita-primary sm:text-base"

const financeDetailsSubtitleClass = "mt-0.5 text-[11px] leading-snug text-orbita-secondary"

/** Cuerpo expandido: mismo borde y mezcla que el bloque de presupuestos (alineado entre sí). */
const financeDetailsBodyClass =
  "space-y-3 border-t border-orbita-border/60 bg-[color-mix(in_srgb,var(--color-surface-alt)_36%,var(--color-surface))] px-3 pb-3 pt-2.5 sm:px-4 sm:pb-4"

/** Inputs del formulario catálogo: líneas finas, sin titulares en mayúsculas. */
const catalogFormFieldClass =
  "rounded-md border border-orbita-border/55 bg-orbita-surface px-2 py-1 text-xs text-orbita-primary outline-none transition placeholder:text-orbita-muted/80 focus:border-[color-mix(in_srgb,var(--color-accent-finance)_40%,var(--color-border))] focus:ring-1 focus:ring-[color-mix(in_srgb,var(--color-accent-finance)_22%,transparent)]"

/** Fondo por fila: categoría = bloque fuerte por tipo; sub = apoyo neutro con ligero matiz (evita que todo se vea igual). */
function budgetTableRowSurface(type: Category["type"], tier: "category" | "sub"): CSSProperties {
  const p = type === "fixed" ? FINANCE_GASTO_FIJO : FINANCE_GASTO_VARIABLE
  if (tier === "category") {
    return {
      background: `color-mix(in srgb, ${p.accent} 11%, color-mix(in srgb, ${p.wash} 46%, var(--color-surface)))`,
      boxShadow: `inset 0 1px 0 0 color-mix(in srgb, ${p.accent} 22%, transparent)`,
    }
  }
  return {
    background: `color-mix(in srgb, ${p.wash} 9%, color-mix(in srgb, var(--color-surface-alt) 78%, var(--color-surface)))`,
  }
}

function formatBudgetRollingCop(n: number): string {
  return `$${Math.round(n).toLocaleString("es-CO", { maximumFractionDigits: 0 })}`
}

/** Promedio mensual neto (6 meses) en COP; si hay tope guardado en la fila, Δ vs ese tope. */
function BudgetRollingSixMonthCell({
  stat,
  assignedCap,
}: {
  stat?: RollingSixMonthStat
  assignedCap?: number | null
}) {
  if (!stat) {
    return <span className="text-orbita-muted">—</span>
  }
  const avg = Math.round(stat.avgMonthlyAbs)
  const cap =
    assignedCap != null && assignedCap > 0 && Number.isFinite(assignedCap) ? Math.round(assignedCap) : null
  const diff = cap != null ? avg - cap : null
  const diffTone =
    diff == null
      ? ""
      : diff > 0
        ? "text-rose-700 dark:text-rose-400"
        : diff < 0
          ? "text-emerald-800 dark:text-emerald-400"
          : "text-orbita-muted"

  const title =
    cap != null
      ? `Promedio mensual (últimos 6 meses): ${formatBudgetRollingCop(avg)} · Tope asignado: ${formatBudgetRollingCop(cap)} · Diferencia (promedio − tope): ${formatBudgetRollingCop(diff ?? 0)}`
      : `Promedio mensual neto de gasto en los últimos 6 meses (${formatBudgetRollingCop(avg)}). Sin tope en COP en esta fila: no hay Δ vs presupuesto.`

  return (
    <div className="text-right" title={title}>
      <div className="tabular-nums text-xs font-semibold leading-tight text-orbita-primary sm:text-[13px]">
        {formatBudgetRollingCop(avg)}
      </div>
      {diff != null ? (
        <div className={cn("mt-0.5 text-[8px] font-semibold tabular-nums leading-tight sm:text-[9px]", diffTone)}>
          {diff === 0 ? (
            <span className="text-orbita-muted">Igual al tope</span>
          ) : diff > 0 ? (
            <span>+{formatBudgetRollingCop(diff)} vs tope</span>
          ) : (
            <span>−{formatBudgetRollingCop(Math.abs(diff))} vs tope</span>
          )}
        </div>
      ) : null}
    </div>
  )
}

function parseMoneyInput(s: string): number | null {
  const d = s.replace(/[^\d]/g, "")
  if (!d) return null
  const n = parseInt(d, 10)
  return Number.isFinite(n) && n > 0 ? n : null
}

function budgetBarTone(status: Category["budgetStatus"]) {
  if (status === "red") return "bg-rose-500 shadow-[inset_0_0_0_1px_rgba(244,63,94,0.35)]"
  if (status === "yellow") return "bg-amber-500 shadow-[inset_0_0_0_1px_rgba(245,158,11,0.35)]"
  return "bg-emerald-500 shadow-[inset_0_0_0_1px_rgba(16,185,129,0.35)]"
}

function budgetTrackStyle(type: Category["type"]): CSSProperties {
  const p = type === "fixed" ? FINANCE_GASTO_FIJO : FINANCE_GASTO_VARIABLE
  return {
    backgroundColor: `color-mix(in srgb, ${p.wash} 92%, var(--color-surface))`,
    boxShadow: `inset 0 0 0 1px color-mix(in srgb, ${p.border} 50%, transparent)`,
  }
}

/** Mini barra de uso vs tope (referencia): feedback rápido tipo “medidor”. */
function BudgetUseMeter({
  type,
  pct,
  status,
  subtle,
}: {
  type: Category["type"]
  pct?: number | null
  status?: Category["budgetStatus"]
  subtle?: boolean
}) {
  if (pct == null || status == null) return null
  const w = Math.min(150, Math.max(0, pct))
  return (
    <div
      className={cn("flex justify-end", subtle ? "mt-0.5" : "mt-1")}
      aria-hidden
      title={`${Math.round(w)}% del tope de referencia`}
    >
      <div
        className={cn(
          "max-w-full overflow-hidden rounded-full",
          subtle ? "h-0.5 w-12" : "h-1 w-[4.25rem]",
        )}
        style={budgetTrackStyle(type)}
      >
        <div
          className={cn("h-full rounded-full transition-[width] duration-500 ease-out", budgetBarTone(status))}
          style={{ width: `${Math.min(100, w)}%` }}
        />
      </div>
    </div>
  )
}

/** Subcategoría: sin mini-barra; solo saldo vs tope del mes en COP. */
function SubBudgetMonthLedger({
  spentAbs,
  capCop,
}: {
  spentAbs: number
  capCop: number | null | undefined
}) {
  if (capCop == null || !Number.isFinite(capCop) || capCop <= 0) return null
  const diff = spentAbs - capCop
  const fmt = (n: number) => `$${Math.round(Math.abs(n)).toLocaleString("es-CO")}`
  if (diff <= 0) {
    return (
      <p
        className="m-0 mt-0.5 text-right text-[8px] font-semibold tabular-nums leading-tight text-emerald-800 dark:text-emerald-300/95"
        title="Gasto del mes vs tope en esta fila"
      >
        Quedan {fmt(-diff)} del tope
      </p>
    )
  }
  return (
    <p
      className="m-0 mt-0.5 text-right text-[8px] font-semibold tabular-nums leading-tight text-rose-800 dark:text-rose-300/95"
      title="Gasto del mes vs tope en esta fila"
    >
      +{fmt(diff)} sobre tope
    </p>
  )
}

function OperativaCategoryCard({
  cat,
  onViewMovements,
  layoutIndex = 0,
  tipoTotalAbs,
}: {
  cat: Category
  onViewMovements: (name: string) => void
  /** Retraso en lista para entrada escalonada. */
  layoutIndex?: number
  /** Total del mismo tipo en el mes (misma base que los KPI de la columna). */
  tipoTotalAbs: number
}) {
  const reduceMotion = useReducedMotion()
  const subCount = cat.subcategories?.length ?? 0
  const shareOfTipo =
    tipoTotalAbs > 0 ? Math.min(100, Math.round((Math.abs(cat.total) / tipoTotalAbs) * 100)) : null

  const tipoPalette = cat.type === "fixed" ? FINANCE_GASTO_FIJO : FINANCE_GASTO_VARIABLE

  const innerList = {
    hidden: {},
    show: {
      transition: {
        staggerChildren: reduceMotion ? 0 : 0.06,
        delayChildren: reduceMotion ? 0 : 0.04,
      },
    },
  }

  const innerSection = {
    hidden: { opacity: reduceMotion ? 1 : 0, y: reduceMotion ? 0 : 12 },
    show: {
      opacity: 1,
      y: 0,
      transition: { duration: reduceMotion ? 0 : 0.38, ease: [0.22, 1, 0.36, 1] as const },
    },
  }

  const springBar = reduceMotion
    ? { duration: 0.25 }
    : { type: "spring" as const, stiffness: 380, damping: 28, delay: 0.06 + layoutIndex * 0.025 }

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.15 }}
      transition={{
        duration: reduceMotion ? 0.2 : 0.45,
        delay: layoutIndex * (reduceMotion ? 0.02 : 0.045),
        ease: [0.22, 1, 0.36, 1],
      }}
      whileHover={
        reduceMotion
          ? { y: -2 }
          : {
              y: -5,
              scale: 1.012,
              transition: { type: "spring", stiffness: 420, damping: 24 },
            }
      }
      whileTap={reduceMotion ? undefined : { scale: 0.992 }}
      className="group min-w-0"
    >
    <Card
      className="relative overflow-hidden p-0 transition-[box-shadow,transform,border-color] duration-300 hover:shadow-[0_20px_52px_-12px_color-mix(in_srgb,var(--color-text-primary)_18%,transparent)]"
      style={{
        background: `linear-gradient(155deg,
          color-mix(in srgb, ${tipoPalette.wash} 28%, var(--color-surface-alt)) 0%,
          color-mix(in srgb, var(--color-surface-alt) 58%, var(--color-surface)) 44%,
          color-mix(in srgb, var(--color-surface) 92%, var(--color-surface-alt)) 100%)`,
        border: `1px solid color-mix(in srgb, ${tipoPalette.border} 22%, color-mix(in srgb, var(--color-border) 88%, transparent))`,
        boxShadow: [
          "0 8px 32px -14px color-mix(in srgb, var(--color-text-primary) 14%, transparent)",
          "0 2px 8px -2px color-mix(in srgb, var(--color-text-primary) 8%, transparent)",
          "inset 0 1px 0 0 color-mix(in srgb, var(--color-text-primary) 6%, transparent)",
        ].join(", "),
      }}
    >
      {/* Dinamismo sin franja lateral: halos de color del tipo + pulso muy suave (gamificación ligera). */}
      <motion.div
        aria-hidden
        className="pointer-events-none absolute -right-10 -top-14 z-[1] size-[7.5rem] rounded-full blur-3xl"
        style={{
          background: `radial-gradient(circle at 40% 40%, color-mix(in srgb, ${tipoPalette.accent} 55%, transparent), transparent 72%)`,
        }}
        animate={
          reduceMotion
            ? { opacity: 0.44, scale: 1 }
            : { opacity: [0.38, 0.52, 0.38], scale: [1, 1.06, 1] }
        }
        transition={
          reduceMotion
            ? { duration: 0 }
            : { duration: 5.5 + layoutIndex * 0.15, repeat: Infinity, ease: "easeInOut" }
        }
      />
      <motion.div
        aria-hidden
        className="pointer-events-none absolute -bottom-12 -left-8 z-[1] size-[6rem] rounded-full blur-3xl"
        style={{
          background: `radial-gradient(circle at 60% 60%, color-mix(in srgb, ${tipoPalette.border} 42%, transparent), transparent 70%)`,
        }}
        animate={reduceMotion ? { opacity: 0.28 } : { opacity: [0.22, 0.34, 0.22] }}
        transition={
          reduceMotion
            ? { duration: 0 }
            : { duration: 6.2, repeat: Infinity, ease: "easeInOut", delay: layoutIndex * 0.12 }
        }
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 z-[1] opacity-0 transition-opacity duration-500 ease-out group-hover:opacity-100"
        style={{
          background: `radial-gradient(120% 80% at 90% -10%, color-mix(in srgb, ${tipoPalette.accent} 18%, transparent), transparent 55%)`,
        }}
      />
      {!reduceMotion ? (
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 z-[1] opacity-0 mix-blend-overlay transition-opacity duration-500 group-hover:opacity-100"
          style={{
            background: `linear-gradient(105deg, transparent 0%, color-mix(in srgb, ${tipoPalette.accent} 22%, transparent) 45%, transparent 100%)`,
          }}
        />
      ) : null}
      <motion.div
        className="relative z-[2] grid gap-2 p-3 text-left sm:gap-2.5 sm:p-4"
        variants={innerList}
        initial="hidden"
        animate="show"
      >
        <motion.div
          variants={innerSection}
          className="flex flex-wrap items-start justify-between gap-x-3 gap-y-1.5"
        >
          <div className="min-w-0 flex-1">
            <p className="flex min-w-0 flex-wrap items-baseline gap-x-2 gap-y-0.5 text-base font-semibold leading-snug tracking-tight text-orbita-primary">
              <motion.span
                className="break-words"
                initial={reduceMotion ? false : { opacity: 0.85, filter: "blur(4px)" }}
                animate={{ opacity: 1, filter: "blur(0px)" }}
                transition={{ duration: 0.45, delay: layoutIndex * 0.03, ease: [0.22, 1, 0.36, 1] }}
              >
                {cat.name}
              </motion.span>
              {shareOfTipo != null ? (
                <motion.span
                  className="shrink-0 tabular-nums text-[10px] font-semibold text-orbita-muted sm:text-[11px]"
                  title={
                    cat.type === "fixed"
                      ? "Peso sobre el total de gasto fijo del mes"
                      : "Peso sobre el total de gasto variable del mes"
                  }
                  initial={reduceMotion ? false : { scale: 0.92, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ type: "spring", stiffness: 500, damping: 28, delay: 0.08 }}
                >
                  {shareOfTipo}%
                </motion.span>
              ) : null}
            </p>
            {cat.delta !== undefined ? (
              <motion.p
                className={cn(
                  "mt-1 text-[10px] font-medium tabular-nums",
                  cat.delta > 0
                    ? "text-rose-600 dark:text-rose-400"
                    : "text-orange-700 dark:text-orange-400",
                )}
                initial={reduceMotion ? false : { opacity: 0, x: -6 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3, delay: 0.06 }}
              >
                {cat.delta > 0 ? "+" : ""}
                {cat.delta.toFixed(0)} vs mes anterior
              </motion.p>
            ) : null}
          </div>
          <div className="flex shrink-0 flex-col items-end gap-1 text-right">
            <motion.p
              className="tabular-nums text-lg font-semibold leading-none tracking-tight text-orbita-primary sm:text-xl"
              initial={reduceMotion ? false : { opacity: 0, y: 8, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ type: "spring", stiffness: 400, damping: 26, delay: 0.04 }}
            >
              ${Math.abs(cat.total).toLocaleString("es-CO", { maximumFractionDigits: 0 })}
            </motion.p>
            <motion.button
              type="button"
              onClick={() => onViewMovements(cat.name)}
              className="text-[11px] font-medium text-orbita-muted underline-offset-[3px] transition-colors hover:text-[color-mix(in_srgb,var(--color-accent-finance)_88%,var(--color-text-primary))] hover:underline"
              whileHover={reduceMotion ? undefined : { x: 3 }}
              whileTap={reduceMotion ? undefined : { scale: 0.97 }}
              transition={{ type: "spring", stiffness: 520, damping: 30 }}
            >
              Ver movimientos
            </motion.button>
          </div>
        </motion.div>

        {cat.budget && cat.budget > 0 && (
          <motion.div variants={innerSection} className="grid gap-1.5">
            <div className="flex items-center justify-between gap-2 text-[11px]">
              <span className="font-medium text-orbita-secondary">Presupuesto</span>
              <motion.span
                className="tabular-nums font-semibold text-orbita-primary"
                key={cat.budgetUsedPercent}
                initial={reduceMotion ? false : { scale: 1.12 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 600, damping: 22 }}
              >
                {cat.budgetUsedPercent?.toFixed(0)}%
              </motion.span>
            </div>
            <div className="relative h-2 overflow-hidden rounded-full" style={budgetTrackStyle(cat.type)}>
              <motion.div
                className={`${budgetBarTone(cat.budgetStatus)} relative z-[1] h-full rounded-full origin-left`}
                initial={{ width: "0%", scaleY: reduceMotion ? 1 : 0.88 }}
                animate={{
                  width: `${Math.min(cat.budgetUsedPercent || 0, 100)}%`,
                  scaleY: 1,
                }}
                transition={springBar}
              />
              {!reduceMotion ? (
                <motion.div
                  aria-hidden
                  className="pointer-events-none absolute inset-y-0 left-0 z-[2] w-[45%] max-w-[7rem] rounded-full bg-gradient-to-r from-white/35 via-white/10 to-transparent"
                  initial={{ x: "-120%", opacity: 0 }}
                  animate={{
                    x: ["-120%", "220%"],
                    opacity: [0, 0.55, 0.35, 0],
                  }}
                  transition={{
                    duration: 2.2,
                    repeat: Infinity,
                    repeatDelay: 3.8 + layoutIndex * 0.35,
                    ease: "easeInOut",
                    times: [0, 0.45, 0.72, 1],
                  }}
                />
              ) : null}
            </div>
          </motion.div>
        )}

        {cat.subcategories && subCount > 0 ? (
          <motion.div variants={innerSection}>
            <details className="group/sub border-t border-orbita-border/50 pt-2">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-2 rounded-md px-1 py-0.5 -mx-1 transition-colors duration-200 hover:bg-[color-mix(in_srgb,var(--color-text-primary)_4%,transparent)] active:scale-[0.99] [&::-webkit-details-marker]:hidden">
              <span className={financeCardMicroLabelClass}>
                Subcategorías ({subCount})
              </span>
              <ChevronDown
                className="h-3.5 w-3.5 shrink-0 text-orbita-secondary transition-transform duration-300 ease-out group-open/sub:rotate-180"
                aria-hidden
              />
            </summary>
            <div className="mt-2 divide-y divide-orbita-border/35">
              {cat.subcategories.map((sub, idx) => {
                const parentAbs = Math.abs(cat.total)
                const shareOfCategory =
                  parentAbs > 0
                    ? Math.min(100, Math.round((Math.abs(sub.total) / parentAbs) * 100))
                    : null
                return (
                <motion.div
                  key={idx}
                  className="grid gap-1 py-1.5 first:pt-0 last:pb-0 sm:gap-1.5 sm:py-2"
                  initial={reduceMotion ? false : { opacity: 0, x: -10 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true, amount: 0.3 }}
                  transition={{
                    duration: reduceMotion ? 0 : 0.32,
                    delay: reduceMotion ? 0 : idx * 0.055,
                    ease: [0.22, 1, 0.36, 1],
                  }}
                >
                  <div className="flex min-w-0 items-baseline justify-between gap-2 text-[11px] leading-tight text-orbita-primary">
                    <div className="min-w-0 flex-1">
                      <span className="inline-flex min-w-0 flex-wrap items-baseline gap-x-1.5 gap-y-0.5">
                        {shareOfCategory != null ? (
                          <span
                            className="shrink-0 tabular-nums text-[9px] font-semibold text-orbita-muted sm:text-[10px]"
                            title={`Peso sobre el total de «${cat.name}» en este mes`}
                          >
                            {shareOfCategory}%
                          </span>
                        ) : null}
                        <span className="break-words font-medium">{sub.name}</span>
                      </span>
                      {sub.categoryMismatch && sub.catalogCategory ? (
                        <p
                          className="mt-0.5 text-[9px] leading-snug text-amber-800 dark:text-amber-300"
                          title="La categoría del movimiento no coincide con la del catálogo"
                        >
                          Cat. catálogo: {sub.catalogCategory}
                        </p>
                      ) : null}
                    </div>
                    <span className="shrink-0 tabular-nums font-semibold tracking-tight">
                      ${Math.abs(sub.total).toLocaleString("es-CO", { maximumFractionDigits: 0 })}
                    </span>
                  </div>
                  {sub.budgetCap != null && sub.budgetCap > 0 && sub.budgetUsedPercent != null ? (
                    <div className="grid gap-0.5 pl-0">
                      <div className="flex items-center justify-between text-[9px] text-orbita-secondary">
                        <span>Sub presupuesto</span>
                        <span className="tabular-nums font-medium text-orbita-primary">{sub.budgetUsedPercent}%</span>
                      </div>
                      <div className="h-1 overflow-hidden rounded-full" style={budgetTrackStyle(cat.type)}>
                        <motion.div
                          className={`${budgetBarTone(sub.budgetStatus)} h-full rounded-full origin-left`}
                          initial={{ width: "0%", scaleY: reduceMotion ? 1 : 0.88 }}
                          animate={{ width: `${Math.min(sub.budgetUsedPercent, 100)}%`, scaleY: 1 }}
                          transition={springBar}
                        />
                      </div>
                    </div>
                  ) : null}
                </motion.div>
                )
              })}
            </div>
            </details>
          </motion.div>
        ) : null}
      </motion.div>
    </Card>
    </motion.div>
  )
}

const mockCategories: CategoriesData = {
  totalFixed: 6200000,
  totalVariable: 3800000,
  totalStructural: 10000000,
  structuralCategories: [
    {
      name: "Vivienda",
      type: "fixed",
      total: -3200000,
      delta: -4,
      budget: 3400000,
      budgetUsedPercent: 94,
      budgetStatus: "yellow",
      subcategories: [
        { name: "Arriendo", total: -2600000 },
        { name: "Servicios", total: -600000 },
      ],
    },
    {
      name: "Seguro & Salud",
      type: "fixed",
      total: -1800000,
      delta: 2,
      budget: 2000000,
      budgetUsedPercent: 90,
      budgetStatus: "green",
      subcategories: [
        { name: "Seguro médico", total: -1200000 },
        { name: "Suplementos", total: -600000 },
      ],
    },
    {
      name: "Operación",
      type: "variable",
      total: -2100000,
      delta: 8,
      budget: 2200000,
      budgetUsedPercent: 96,
      budgetStatus: "red",
      subcategories: [
        { name: "Software", total: -900000 },
        { name: "Servicios", total: -700000 },
        { name: "Freelance", total: -500000 },
      ],
    },
    {
      name: "Estilo de vida",
      type: "variable",
      total: -1700000,
      delta: -6,
      budget: 2000000,
      budgetUsedPercent: 85,
      budgetStatus: "green",
      subcategories: [
        { name: "Movilidad", total: -500000 },
        { name: "Entrenamiento", total: -400000 },
        { name: "Alimentación", total: -800000 },
      ],
    },
  ],
}

function formatBudgetTimestamp(iso: string) {
  try {
    return new Intl.DateTimeFormat("es-CO", { dateStyle: "short", timeStyle: "short" }).format(new Date(iso))
  } catch {
    return iso
  }
}

export default function FinanzasCategories() {
  const finance = useFinance()
  const router = useRouter()
  const [data, setData] = useState<CategoriesData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<"operativa" | "estrategica" | "predictiva">("operativa")
  const [notice, setNotice] = useState<string | null>(null)
  const [categoryQuery, setCategoryQuery] = useState("")

  const month_value = finance?.month
  const capitalEpoch = finance?.capitalDataEpoch ?? 0
  const [savingCatalogId, setSavingCatalogId] = useState<string | null>(null)
  const [newOverride, setNewOverride] = useState({
    subcategory: "",
    category: "",
    expense_type: "variable" as FinanceSubcategoryCatalogRow["expense_type"],
    financial_impact: "operativo",
  })
  const [creatingOverride, setCreatingOverride] = useState(false)
  const [budgetRevision, setBudgetRevision] = useState(0)
  const [budgetDraft, setBudgetDraft] = useState<MonthCategoryBudgetsV1>({
    version: 1,
    category: {},
    subcategory: {},
  })
  const [householdPushNeeded, setHouseholdPushNeeded] = useState(false)
  const [householdSaving, setHouseholdSaving] = useState(false)
  const [householdSyncHint, setHouseholdSyncHint] = useState<string | null>(null)

  const loadCategories = useCallback(
    async (opts?: { quiet?: boolean }) => {
      if (!month_value) {
        setData(null)
        setLoading(false)
        setError(null)
        return
      }
      const quiet = opts?.quiet === true
      try {
        if (!quiet) {
          setLoading(true)
          setError(null)
        }

        const response = await financeApiGet(
          `/api/orbita/finanzas/categories?month=${encodeURIComponent(month_value)}`,
        )

        const json = (await response.json()) as CategoriesResponse & { notice?: string }

        if (!response.ok || !json.success) {
          throw new Error(messageForHttpError(response.status, json.error, response.statusText))
        }

        setNotice(json.notice ?? null)
        setData(json.data ?? null)
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : "Error desconocido"
        if (!quiet) {
          setError(errorMessage)
          setData(null)
        }
      } finally {
        if (!quiet) setLoading(false)
      }
    },
    [month_value, capitalEpoch],
  )

  useEffect(() => {
    void loadCategories()
  }, [loadCategories])

  useEffect(() => {
    if (month_value) setBudgetDraft(loadMonthBudgets(month_value))
  }, [month_value, budgetRevision])

  useEffect(() => {
    if (!month_value || !isSupabaseEnabled() || isAppMockMode()) return
    let cancelled = false
    ;(async () => {
      try {
        const res = await financeApiGet("/api/orbita/finanzas/category-budgets")
        const json = (await res.json()) as {
          success?: boolean
          data: { template: MonthCategoryBudgetsV1; updated_at: string } | null
          error?: string
        }
        if (!res.ok || !json.success || cancelled) return
        if (!json.data) return
        const local = loadBudgetStore()
        if (!shouldApplyRemotePull(local, json.data.updated_at)) return
        applyBudgetTemplateFromRemote(json.data.template, json.data.updated_at)
        setBudgetDraft(loadMonthBudgets(month_value))
        setBudgetRevision((x) => x + 1)
        setHouseholdPushNeeded(false)
        setHouseholdSyncHint("Sincronizado desde el hogar.")
      } catch {
        /* offline u error silencioso */
      }
    })()
    return () => {
      cancelled = true
    }
  }, [month_value, capitalEpoch])

  const pushBudgetsToHousehold = useCallback(async () => {
    if (!isSupabaseEnabled() || isAppMockMode()) {
      setHouseholdSyncHint("Activa la sincronización con cuenta para guardar en el hogar.")
      return
    }
    setHouseholdSaving(true)
    setHouseholdSyncHint(null)
    try {
      const store = loadBudgetStore()
      const res = await financeApiJson("/api/orbita/finanzas/category-budgets", {
        method: "POST",
        body: { template: store.template },
      })
      const json = (await res.json()) as {
        success?: boolean
        data?: { updated_at?: string }
        error?: string
      }
      if (!res.ok || !json.success || !json.data?.updated_at) {
        throw new Error(messageForHttpError(res.status, json.error, res.statusText))
      }
      markBudgetRemoteSynced(json.data.updated_at)
      setHouseholdPushNeeded(false)
      setBudgetRevision((r) => r + 1)
      setHouseholdSyncHint("Guardado en el hogar.")
    } catch (e) {
      setHouseholdSyncHint(e instanceof Error ? e.message : "No se pudo guardar en el hogar.")
    } finally {
      setHouseholdSaving(false)
    }
  }, [])

  const structuralCategoriesRaw = data?.structuralCategories ?? []

  const storedMonthBudgets = useMemo(() => {
    if (!month_value) return { version: 1 as const, category: {}, subcategory: {} }
    return loadMonthBudgets(month_value)
  }, [month_value, budgetRevision])

  const structuralCategoriesUi = useMemo(
    () => structuralCategoriesRaw.filter((c) => !isModuloFinancieroStructuralCategory(c)),
    [structuralCategoriesRaw],
  )

  const structuralWithBudgets = useMemo(
    () => applyClientCategoryBudgets(structuralCategoriesUi, storedMonthBudgets),
    [structuralCategoriesUi, storedMonthBudgets],
  )

  const sortedBudgetCategoriesForOperativa = useMemo(
    () =>
      [...structuralWithBudgets]
        .filter((c) => Math.abs(c.total) > 0)
        .sort((a, b) => {
          const ta = a.type === "fixed" ? 0 : 1
          const tb = b.type === "fixed" ? 0 : 1
          if (ta !== tb) return ta - tb
          return Math.abs(b.total) - Math.abs(a.total)
        }),
    [structuralWithBudgets],
  )

  const budgetStoreSnapshot = useMemo(() => loadBudgetStore(), [budgetRevision])

  const rollingSixMonthByBudgetKey = data?.rollingSixMonthByBudgetKey ?? {}

  const commitCategoryBudget = useCallback((cat: Category, raw: string) => {
    if (!month_value) return
    const n = parseMoneyInput(raw)
    const key = categoryBudgetKey(cat.type, cat.name)
    const base = loadMonthBudgets(month_value)
    const next: MonthCategoryBudgetsV1 = {
      version: 1,
      category: { ...base.category },
      subcategory: { ...base.subcategory },
    }
    if (n == null || n <= 0) delete next.category[key]
    else next.category[key] = n
    saveMonthBudgets(month_value, next)
    setBudgetDraft(next)
    setBudgetRevision((r) => r + 1)
    if (isSupabaseEnabled() && !isAppMockMode()) {
      setHouseholdPushNeeded(true)
      setHouseholdSyncHint(null)
    }
  }, [month_value])

  const commitSubcategoryBudget = useCallback((cat: Category, subName: string, raw: string) => {
    if (!month_value) return
    const n = parseMoneyInput(raw)
    const key = subcategoryBudgetKey(cat.type, cat.name, subName)
    const base = loadMonthBudgets(month_value)
    const next: MonthCategoryBudgetsV1 = {
      version: 1,
      category: { ...base.category },
      subcategory: { ...base.subcategory },
    }
    if (n == null || n <= 0) delete next.subcategory[key]
    else next.subcategory[key] = n
    saveMonthBudgets(month_value, next)
    setBudgetDraft(next)
    setBudgetRevision((r) => r + 1)
    if (isSupabaseEnabled() && !isAppMockMode()) {
      setHouseholdPushNeeded(true)
      setHouseholdSyncHint(null)
    }
  }, [month_value])

  if (!finance) {
    return (
      <div className="p-6 text-center text-orbita-secondary">
        <p>Inicializando...</p>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="p-6 text-center text-orbita-secondary">
        <p>Cargando categorías...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div
        className="rounded-[var(--radius-card)] border p-4"
        style={{
          background: "color-mix(in srgb, var(--color-accent-danger) 10%, var(--color-surface))",
          borderColor: "color-mix(in srgb, var(--color-accent-danger) 32%, var(--color-border))",
          color: "var(--color-accent-danger)",
        }}
      >
        <p className="font-semibold">Error al cargar categorías</p>
        <p className="text-sm mt-1">{error}</p>
      </div>
    )
  }

  const totalFixed = data?.totalFixed ?? 0
  const totalVariable = data?.totalVariable ?? 0
  const unknownSubcategories = data?.unknownSubcategories ?? []
  const householdCatalogRows = data?.subcategoryCatalog ?? []

  const moduloCategory = structuralCategoriesRaw.find((c) => isModuloFinancieroStructuralCategory(c))
  const moduloTotalAbs = moduloCategory ? Math.abs(moduloCategory.total) : 0
  const totalVariableUi = Math.max(0, totalVariable - moduloTotalAbs)
  const totalStructuralUi = totalFixed + totalVariableUi

  async function saveCatalogExpenseType(id: string, expense_type: FinanceSubcategoryCatalogRow["expense_type"]) {
    setSavingCatalogId(id)
    try {
      const res = await financeApiJson("/api/orbita/finanzas/subcategory-catalog", {
        method: "PATCH",
        body: { id, expense_type },
      })
      const json = (await res.json()) as { success?: boolean; error?: string }
      if (!res.ok || !json.success) {
        throw new Error(json.error ?? "No se pudo guardar")
      }
      await loadCategories({ quiet: true })
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error guardando catálogo")
    } finally {
      setSavingCatalogId(null)
    }
  }

  async function createHouseholdOverride(e: FormEvent) {
    e.preventDefault()
    if (!newOverride.subcategory.trim() || !newOverride.category.trim()) return
    setCreatingOverride(true)
    try {
      const res = await financeApiJson("/api/orbita/finanzas/subcategory-catalog", {
        method: "POST",
        body: {
          subcategory: newOverride.subcategory.trim(),
          category: newOverride.category.trim(),
          expense_type: newOverride.expense_type,
          financial_impact: newOverride.financial_impact,
        },
      })
      const json = (await res.json()) as { success?: boolean; error?: string }
      if (!res.ok || !json.success) {
        throw new Error(json.error ?? "No se pudo crear la fila")
      }
      setNewOverride({
        subcategory: "",
        category: "",
        expense_type: "variable",
        financial_impact: "operativo",
      })
      await loadCategories({ quiet: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error creando fila")
    } finally {
      setCreatingOverride(false)
    }
  }

  const noExpenses = structuralCategoriesUi.length === 0 || totalStructuralUi === 0

  const q = categoryQuery.trim().toLowerCase()
  const matchesQuery = (cat: Category) => {
    if (!q) return true
    if (cat.name.toLowerCase().includes(q)) return true
    return (cat.subcategories ?? []).some((s) => s.name.toLowerCase().includes(q))
  }

  const fixedCategories = (structuralWithBudgets || [])
    .filter((c): c is Category => c?.type === "fixed" && Math.abs(c.total) > 0)
    .filter(matchesQuery)
    .sort((a, b) => Math.abs(b.total) - Math.abs(a.total))

  const variableCategories = (structuralWithBudgets || [])
    .filter((c): c is Category => c?.type === "variable" && Math.abs(c.total) > 0)
    .filter(matchesQuery)
    .sort((a, b) => Math.abs(b.total) - Math.abs(a.total))

  const fixedPct =
    Math.abs(totalStructuralUi) > 0
      ? Math.round((Math.abs(totalFixed) / Math.abs(totalStructuralUi)) * 100)
      : 0

  const navigateToTransactions = (categoryName: string) => {
    const p = new URLSearchParams()
    if (month_value) p.set("month", month_value)
    p.set("category", categoryName)
    router.push(`/finanzas/transactions?${p.toString()}`)
  }

  return (
    <div className={cn(financePlStackClass, financeModuleContentStackClass)}>
      <section aria-label="Mapa de categorías y búsqueda">
        {/* Panel ligero debajo del hero Capital: menos borde/sombra que la tarjeta del menú para no repetir bloque. */}
        <div
          className={cn(
            "relative z-[1] min-w-0 overflow-hidden rounded-2xl border border-orbita-border/45",
            "bg-[color-mix(in_srgb,var(--color-surface-alt)_30%,var(--color-surface))]",
            "shadow-[0_6px_28px_-14px_rgba(15,23,42,0.12)] sm:rounded-3xl",
            "-mt-1 sm:-mt-0.5",
          )}
        >
          <header className="flex flex-row items-start justify-between gap-2 border-b border-orbita-border/40 px-3 pb-2 pt-3 sm:gap-3 sm:px-4 sm:pb-2.5 sm:pt-3.5">
            <div className="min-w-0 flex-1 pr-1 sm:pr-2">
              <p className={financeSectionEyebrowClass}>Tu mapa en este mes</p>
              <p className={cn(financeSectionIntroClass, "mt-0.5 leading-snug sm:leading-snug")}>
                Ves cómo se reparte el gasto entre lo fijo y lo variable; el modo cambia la lectura — el mes lo elige el
                hero de Capital.
              </p>
            </div>
            <div className="flex shrink-0 flex-col items-end gap-1 sm:flex-wrap sm:items-end sm:justify-end sm:gap-1.5 sm:pt-px">
              {notice ? (
                <span className={financeNoticeChipClass} role="status">
                  {notice}
                </span>
              ) : null}
              <span
                className={cn(
                  financeHeroChipBaseClass,
                  "relative border-orbita-border/55 bg-orbita-surface-alt/80 py-px pl-5 text-[9px] text-orbita-secondary shadow-sm before:absolute before:left-1 before:top-1/2 before:size-1 before:-translate-y-1/2 before:rounded-full before:bg-[color-mix(in_srgb,var(--color-accent-finance)_65%,transparent)] before:shadow-[0_0_0_2px_color-mix(in_srgb,var(--color-accent-finance)_22%,transparent)] sm:pl-6 sm:text-[10px] before:sm:left-1.5 before:sm:size-1.5",
                )}
                title="Datos del mes seleccionado en Capital"
              >
                Lectura mensual
              </span>
            </div>
          </header>

          <div className="flex min-w-0 flex-col gap-2 px-3 py-2.5 sm:flex-row sm:items-center sm:gap-2.5 sm:px-4 sm:py-3">
            <div className="touch-pan-x min-w-0 flex-1 overflow-x-auto overscroll-x-contain [-webkit-overflow-scrolling:touch]">
              <div
                className={cn(financeInlineSegmentRailClass, "!flex-nowrap min-w-[min(100%,17.5rem)] w-full")}
                role="tablist"
                aria-label="Modo de vista de categorías"
              >
                {(["operativa", "estrategica", "predictiva"] as const).map((mode) => {
                  const active = viewMode === mode
                  const label =
                    mode === "operativa" ? "Operativa" : mode === "estrategica" ? "Estratégica" : "Predictiva"
                  return (
                    <button
                      key={mode}
                      type="button"
                      role="tab"
                      aria-selected={active}
                      onClick={() => setViewMode(mode)}
                      className={cn(
                        financeSubnavTabClass(active, { subtle: true }),
                        "min-h-8 min-w-0 flex-1 basis-0 px-2 text-[10px] sm:min-h-8 sm:px-2.5 sm:text-[11px]",
                      )}
                    >
                      {label}
                    </button>
                  )
                })}
              </div>
            </div>
            {viewMode === "operativa" ? (
              <input
                type="search"
                value={categoryQuery}
                onChange={(e) => setCategoryQuery(e.target.value)}
                placeholder="Buscar categoría o subcategoría…"
                className="min-h-9 w-full min-w-[min(100%,11rem)] shrink-0 rounded-[var(--radius-button)] border border-orbita-border/80 bg-orbita-surface px-2.5 py-1.5 text-[13px] leading-snug text-orbita-primary shadow-sm outline-none ring-offset-2 transition focus-visible:border-[color-mix(in_srgb,var(--color-accent-finance)_45%,var(--color-border))] focus-visible:ring-2 focus-visible:ring-[color-mix(in_srgb,var(--color-accent-finance)_28%,transparent)] sm:w-[min(100%,20rem)] sm:px-3 sm:text-sm md:min-w-[18rem]"
                aria-label="Filtrar categorías"
              />
            ) : null}
          </div>

          {viewMode !== "operativa" ? (
            <p className="m-0 border-t border-orbita-border/35 px-3 pb-3 pt-2 text-pretty text-[11px] leading-snug text-orbita-muted sm:px-4 sm:pb-3.5 sm:text-xs">
              Desde estas vistas, los accesos abren Movimientos con el mismo mes que elegiste arriba.
            </p>
          ) : null}
        </div>
      </section>

      {viewMode === "estrategica" && (
        <CategoryAnalysisPanels mode="estrategica" budgetRevision={budgetRevision} />
      )}

      {viewMode === "predictiva" && (
        <CategoryAnalysisPanels mode="predictiva" budgetRevision={budgetRevision} />
      )}

      {viewMode === "operativa" && q && fixedCategories.length === 0 && variableCategories.length === 0 ? (
        <div className="rounded-xl border border-orbita-border bg-orbita-surface-alt px-4 py-6 text-center text-sm text-orbita-secondary">
          Ninguna categoría coincide con «{categoryQuery.trim()}». Prueba otro término o borra el filtro.
        </div>
      ) : null}

      {viewMode === "operativa" && (
        <div className="space-y-4">
          {noExpenses && (
            <div className="space-y-2 rounded-lg bg-orbita-surface-alt p-6 text-center">
              <p className="text-orbita-secondary">No hay gastos categorizados para este mes.</p>
              {notice && <p className="text-xs text-orbita-secondary">{notice}</p>}
            </div>
          )}

          {!noExpenses && unknownSubcategories.length > 0 && (
            <div
              className="flex gap-2.5 rounded-xl border px-3 py-2.5 text-[13px] leading-snug"
              style={{
                borderColor: "color-mix(in srgb, var(--color-accent-finance) 35%, var(--color-border))",
                background: "color-mix(in srgb, var(--color-accent-finance) 8%, var(--color-surface))",
              }}
            >
              <AlertTriangle
                className="mt-0.5 h-4 w-4 shrink-0 text-amber-700 dark:text-amber-300"
                strokeWidth={2}
                aria-hidden
              />
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-orbita-primary">Subcategorías sin fila en catálogo</p>
                <p className="mt-0.5 text-[11px] leading-snug text-orbita-secondary">
                  Asignales categoría en la hoja Categorías (Supabase).{" "}
                  <span className="text-orbita-muted">
                    {unknownSubcategories.slice(0, 10).join(" · ")}
                    {unknownSubcategories.length > 10 ? ` · +${unknownSubcategories.length - 10}` : ""}
                  </span>
                </p>
              </div>
            </div>
          )}
          {!noExpenses && (
            <>
              <div className="grid min-w-0 grid-cols-1 gap-2 sm:grid-cols-3 sm:items-stretch sm:gap-3">
                {(
                  [
                    {
                      key: "total",
                      label: "Gasto total",
                      value: Math.abs(totalStructuralUi),
                      cardStyle: CATEGORY_KPI_TOTAL_STYLE,
                    },
                    {
                      key: "fijo",
                      label: "Gasto fijo",
                      value: Math.abs(totalFixed),
                      hint: "Poca flexibilidad de corto plazo (arriendo, cuotas fijas…).",
                      cardStyle: CATEGORY_KPI_FIJO_STYLE,
                    },
                    {
                      key: "variable",
                      label: "Gasto variable",
                      value: Math.abs(totalVariableUi),
                      hint: "Mayor margen de ajuste mes a mes.",
                      cardStyle: CATEGORY_KPI_VARIABLE_STYLE,
                    },
                  ] satisfies OperativaKpiCardRow[]
                ).map((row, idx) => (
                  <motion.div
                    key={row.key}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.35, delay: idx * 0.06, ease: [0.22, 1, 0.36, 1] }}
                    whileHover={{ y: -4, transition: { type: "spring", stiffness: 380, damping: 26 } }}
                    className="flex min-h-0 min-w-0 flex-col"
                  >
                    <Card
                      hover
                      style={row.cardStyle}
                      className="relative isolate flex h-full min-h-0 min-w-0 flex-col overflow-hidden rounded-2xl border p-3 shadow-[var(--shadow-card)] sm:rounded-3xl sm:p-4"
                    >
                      <p className={financeCardMicroLabelClass}>{row.label}</p>
                      <p className="mt-1.5 text-xl font-semibold tabular-nums tracking-tight text-orbita-primary sm:text-2xl">
                        ${row.value.toLocaleString("es-CO", { maximumFractionDigits: 0 })}
                        <span className="ml-1 align-top text-[9px] font-medium uppercase tracking-[0.08em] text-orbita-muted sm:text-[10px]">
                          COP
                        </span>
                      </p>
                      {row.key === "total" ? (
                        <div className="mt-2 flex min-h-[2.35rem] flex-1 flex-col justify-end gap-1">
                          <div
                            className="flex h-[5px] w-full overflow-hidden rounded-full"
                            role="img"
                            aria-label={`${fixedPct}% gasto fijo, ${100 - fixedPct}% gasto variable`}
                            style={{
                              background: `color-mix(in srgb, ${FINANCE_GASTO_TOTAL_MAPA.wash} 72%, var(--color-surface-alt))`,
                              boxShadow: `inset 0 0 0 1px color-mix(in srgb, ${FINANCE_GASTO_TOTAL_MAPA.border} 26%, transparent)`,
                            }}
                          >
                            <motion.div
                              className="h-full shrink-0 rounded-l-full"
                              style={{ backgroundColor: FINANCE_GASTO_FIJO.accent }}
                              initial={{ width: "0%" }}
                              animate={{ width: `${fixedPct}%` }}
                              transition={{ type: "spring", stiffness: 420, damping: 34, delay: 0.06 }}
                            />
                            <motion.div
                              className="h-full min-w-0 flex-1 rounded-r-full"
                              style={{ backgroundColor: FINANCE_GASTO_VARIABLE.accent }}
                              initial={{ opacity: 0.72 }}
                              animate={{ opacity: 1 }}
                              transition={{ duration: 0.32, delay: 0.12 }}
                            />
                          </div>
                          <div className="flex justify-between gap-2 text-[9px] font-medium tabular-nums leading-none tracking-normal text-orbita-muted sm:text-[10px]">
                            <span>Fijo {fixedPct}%</span>
                            <span>Variable {100 - fixedPct}%</span>
                          </div>
                          <p className={cn(operativaKpiHintClass, "[text-wrap:pretty]")}>
                            Suma de gasto fijo y variable del mes (operativo).
                          </p>
                        </div>
                      ) : (
                        <p className={cn(operativaKpiHintClass, "[text-wrap:pretty] mt-1")}>{row.hint}</p>
                      )}
                    </Card>
                  </motion.div>
                ))}
              </div>

              <div className="grid grid-cols-1 gap-5 sm:gap-6 lg:grid-cols-2 lg:gap-8">
                {(
                  [
                    {
                      label: "Fijo" as const,
                      items: fixedCategories,
                    },
                    {
                      label: "Variable" as const,
                      items: variableCategories,
                    },
                  ] as const
                ).map((group, gIdx) => (
                  <motion.div
                    key={group.label}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4, delay: 0.12 + gIdx * 0.08, ease: [0.22, 1, 0.36, 1] }}
                    className="flex min-w-0 flex-col gap-3"
                  >
                    <div className="flex flex-wrap items-end justify-between gap-2 border-b border-orbita-border/40 pb-2">
                      <div className="min-w-0">
                        <span
                          className={sheetTipoPillClass(group.label === "Fijo" ? "fijo" : "variable")}
                          style={sheetTipoPillHexStyle(group.label === "Fijo" ? "fijo" : "variable")}
                        >
                          {group.label === "Fijo" ? "FIJO" : "VARIABLE"}
                        </span>
                      </div>
                      <span className="shrink-0 rounded-full bg-orbita-surface-alt/90 px-2 py-0.5 text-[10px] font-medium tabular-nums text-orbita-secondary ring-1 ring-orbita-border/35">
                        {group.items.length} {group.items.length === 1 ? "bloque" : "bloques"}
                      </span>
                    </div>
                    <div className="space-y-3">
                      {group.items.map((cat, idx) => (
                        <OperativaCategoryCard
                          key={`${cat.name}-${cat.type}`}
                          cat={cat}
                          layoutIndex={idx}
                          tipoTotalAbs={
                            group.label === "Fijo" ? Math.abs(totalFixed) : totalVariableUi
                          }
                          onViewMovements={navigateToTransactions}
                        />
                      ))}
                    </div>
                  </motion.div>
                ))}
              </div>
            </>
          )}

          <Card className="overflow-hidden p-0" style={financeDetailsCardSurfaceStyle}>
            <details className="group">
              <summary className={financeDetailsSummaryClass}>
                <div className="min-w-0 flex-1">
                  <h2 className={financeDetailsTitleClass}>Catálogo de tu hogar</h2>
                  <p className={financeDetailsSubtitleClass}>Tipo por subcategoría · tabla y alta rápida</p>
                </div>
                <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
                  <button
                    type="submit"
                    form="catalog-household-form"
                    disabled={creatingOverride}
                    className={financeSummaryGreenButtonClass}
                  >
                    {creatingOverride ? "Guardando…" : "Agregar fila"}
                  </button>
                  <ChevronDown
                    className="h-4 w-4 shrink-0 text-orbita-secondary transition-transform duration-200 group-open:rotate-180"
                    aria-hidden
                  />
                </div>
              </summary>
              <div className={financeDetailsBodyClass}>
                <p className="text-[11px] leading-snug text-orbita-secondary">
                  <span className="font-semibold text-orbita-primary">Plantilla:</span> no se edita aquí.{" "}
                  <span className="font-semibold text-orbita-primary">Tu hogar:</span> una fila por subcategoría (mismo
                  nombre que la plantilla), tipo de gasto e impacto. Con{" "}
                  <span className={`inline ${sheetTipoPillClass("modulo_finanzas")} px-1 py-0 text-[9px]`}>
                    Módulo finanzas
                  </span>{" "}
                  esos movimientos no entran al mapa operativo.
                  {householdCatalogRows.length === 0 ? (
                    <span className="mt-1 block text-[10px] text-orbita-muted">
                      La tabla está vacía: usa el formulario de abajo para la primera fila.
                    </span>
                  ) : null}
                </p>

                {householdCatalogRows.length > 0 ? (
                  <>
                  <div className="space-y-2 md:hidden">
                    {householdCatalogRows.map((row) => (
                      <div
                        key={`mob-cat-${row.id}`}
                        className="rounded-lg border border-orbita-border/55 bg-orbita-surface-alt/30 px-3 py-2.5"
                      >
                        <p className="text-[12px] font-semibold text-orbita-primary">{row.subcategory}</p>
                        <p className="mt-0.5 text-[11px] text-orbita-secondary">{row.category}</p>
                        <label className="mt-2 block text-[10px] text-orbita-muted">
                          Tipo
                          <select
                            value={row.expense_type}
                            disabled={savingCatalogId === row.id}
                            onChange={(e) => {
                              const v = e.target.value as FinanceSubcategoryCatalogRow["expense_type"]
                              if (v === row.expense_type) return
                              void saveCatalogExpenseType(row.id, v)
                            }}
                            className="mt-0.5 w-full rounded border border-orbita-border/60 bg-orbita-surface px-2 py-1.5 text-[12px] text-orbita-primary"
                            aria-label={`Tipo de gasto para ${row.subcategory}`}
                          >
                            <option value="fijo">Fijo</option>
                            <option value="variable">Variable</option>
                            <option value="modulo_finanzas">Módulo finanzas</option>
                          </select>
                        </label>
                      </div>
                    ))}
                  </div>
                  <div className="hidden touch-pan-x overflow-x-auto overscroll-x-contain [-webkit-overflow-scrolling:touch] md:block">
                    <table className="w-full min-w-[520px] border-collapse text-left text-xs">
                      <thead>
                        <tr className="border-b border-orbita-border/55 bg-orbita-surface-alt/50 text-[10px] uppercase tracking-[0.06em] text-orbita-secondary">
                          <th className="py-1.5 pr-2 pl-0.5 font-semibold">Subcategoría</th>
                          <th className="py-1.5 pr-2 font-semibold">Categoría</th>
                          <th className="py-1.5 pr-2 font-semibold">Tipo</th>
                        </tr>
                      </thead>
                      <tbody>
                        {householdCatalogRows.map((row) => (
                          <tr key={row.id} className="border-b border-orbita-border/60">
                            <td className="py-1.5 pr-2 align-middle text-orbita-primary">{row.subcategory}</td>
                            <td className="py-1.5 pr-2 align-middle text-orbita-secondary">{row.category}</td>
                            <td className="py-1.5 align-middle">
                              <select
                                value={row.expense_type}
                                disabled={savingCatalogId === row.id}
                                onChange={(e) => {
                                  const v = e.target.value as FinanceSubcategoryCatalogRow["expense_type"]
                                  if (v === row.expense_type) return
                                  void saveCatalogExpenseType(row.id, v)
                                }}
                                className="max-w-full rounded border border-orbita-border/60 bg-orbita-surface px-1.5 py-0.5 text-[11px] text-orbita-primary"
                                aria-label={`Tipo de gasto para ${row.subcategory}`}
                              >
                                <option value="fijo">Fijo</option>
                                <option value="variable">Variable</option>
                                <option value="modulo_finanzas">Módulo finanzas</option>
                              </select>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  </>
                ) : null}

                <form
                  id="catalog-household-form"
                  onSubmit={createHouseholdOverride}
                  className="grid gap-1.5 border-t border-orbita-border/55 pt-2.5 sm:grid-cols-2 lg:grid-cols-4"
                >
                  <label className="grid gap-0.5">
                    <span className="text-[9px] font-medium text-orbita-muted">Subcategoría</span>
                    <input
                      value={newOverride.subcategory}
                      onChange={(e) => setNewOverride((s) => ({ ...s, subcategory: e.target.value }))}
                      className={catalogFormFieldClass}
                      placeholder="Ej. Otros"
                      required
                    />
                  </label>
                  <label className="grid gap-0.5">
                    <span className="text-[9px] font-medium text-orbita-muted">Categoría</span>
                    <input
                      value={newOverride.category}
                      onChange={(e) => setNewOverride((s) => ({ ...s, category: e.target.value }))}
                      className={catalogFormFieldClass}
                      placeholder="Ej. Ajustes"
                      required
                    />
                  </label>
                  <label className="grid gap-0.5">
                    <span className="text-[9px] font-medium text-orbita-muted">Tipo</span>
                    <select
                      value={newOverride.expense_type}
                      onChange={(e) =>
                        setNewOverride((s) => ({
                          ...s,
                          expense_type: e.target.value as FinanceSubcategoryCatalogRow["expense_type"],
                        }))
                      }
                      className={catalogFormFieldClass}
                    >
                      <option value="fijo">Fijo</option>
                      <option value="variable">Variable</option>
                      <option value="modulo_finanzas">Módulo finanzas</option>
                    </select>
                  </label>
                  <label className="grid gap-0.5">
                    <span className="text-[9px] font-medium text-orbita-muted">Impacto</span>
                    <select
                      value={newOverride.financial_impact}
                      onChange={(e) => setNewOverride((s) => ({ ...s, financial_impact: e.target.value }))}
                      className={catalogFormFieldClass}
                    >
                      <option value="operativo">Operativo (día a día)</option>
                      <option value="inversion">Inversión</option>
                      <option value="transferencia">Transferencia</option>
                      <option value="financiero">Financiero</option>
                      <option value="ajuste">Ajuste</option>
                    </select>
                  </label>
                </form>
              </div>
            </details>
          </Card>

          <Card className="overflow-hidden p-0" style={financeDetailsCardSurfaceStyle}>
            <details className="group">
              <summary className={financeDetailsSummaryClass}>
                <div className="min-w-0 flex-1">
                  <h2 className={financeDetailsTitleClass}>Presupuestos (COP)</h2>
                  <p className={financeDetailsSubtitleClass}>
                    Topes mensuales (mismo COP siempre) · mes ref. {month_value ?? "—"}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
                  <button
                    type="button"
                    disabled={householdSaving || !isSupabaseEnabled() || isAppMockMode()}
                    onClick={() => void pushBudgetsToHousehold()}
                    className={financeSummaryGreenButtonClass}
                  >
                    {householdSaving ? "Guardando…" : "Guardar"}
                  </button>
                  <ChevronDown
                    className="h-4 w-4 shrink-0 text-orbita-secondary transition-transform duration-200 group-open:rotate-180"
                    aria-hidden
                  />
                </div>
              </summary>
              <div className={financeDetailsBodyClass}>
                <div className="space-y-1 text-[11px] leading-snug text-orbita-secondary">
                  <p>
                    Guardado al salir de cada campo en este equipo; si borras el tope y sales, vuelve la estimación
                    automática.
                    {!isSupabaseEnabled() || isAppMockMode() ? (
                      <span className="text-orbita-muted"> Inicia sesión para sincronizar con el hogar.</span>
                    ) : null}
                  </p>
                  <p className="tabular-nums text-orbita-primary">
                    Aquí <span className="font-medium">{formatBudgetTimestamp(budgetStoreSnapshot.updatedAt)}</span>
                    {budgetStoreSnapshot.lastRemoteUpdatedAt ? (
                      <>
                        {" "}
                        · Hogar{" "}
                        <span className="font-medium">
                          {formatBudgetTimestamp(budgetStoreSnapshot.lastRemoteUpdatedAt)}
                        </span>
                      </>
                    ) : null}
                  </p>
                  {householdPushNeeded && isSupabaseEnabled() && !isAppMockMode() ? (
                    <p className="text-[10px] font-medium text-amber-800 dark:text-amber-200">
                      Cambios locales pendientes de subir — usa Guardar arriba.
                    </p>
                  ) : null}
                  {householdSyncHint ? (
                    <p className="text-[10px] font-medium text-emerald-800 dark:text-emerald-200">{householdSyncHint}</p>
                  ) : null}
                </div>
                <div className="rounded-xl bg-gradient-to-br from-[color-mix(in_srgb,var(--color-accent-finance)_14%,transparent)] via-[color-mix(in_srgb,var(--color-surface-alt)_35%,transparent)] to-[color-mix(in_srgb,var(--color-accent-health)_10%,transparent)] p-px shadow-[0_10px_36px_-14px_color-mix(in_srgb,var(--color-accent-finance)_28%,transparent)] dark:shadow-[0_12px_40px_-12px_rgba(0,0,0,0.35)]">
                  <div className="md:hidden space-y-3 rounded-[11px] border border-orbita-border/45 bg-orbita-surface p-3 shadow-[inset_0_1px_0_0_color-mix(in_srgb,var(--color-text-primary)_7%,transparent)]">
                    {sortedBudgetCategoriesForOperativa.map((cat, catIdx) => {
                      const ck = categoryBudgetKey(cat.type, cat.name)
                      const prevCat = catIdx > 0 ? sortedBudgetCategoriesForOperativa[catIdx - 1]! : null
                      const sectionGap =
                        prevCat != null && prevCat.type !== cat.type
                          ? "mt-4 border-t-2 border-orbita-border/55 pt-4"
                          : ""
                      return (
                        <div key={`mob-budget-${ck}`} className={cn("min-w-0", sectionGap)}>
                          <div className="flex flex-wrap items-center gap-2">
                            <span
                              className="inline-flex min-w-[4.25rem] shrink-0 justify-center rounded-full px-2 py-px text-[8px] font-bold uppercase tracking-wide shadow-sm sm:min-w-[4.75rem] sm:text-[9px]"
                              style={sheetTipoPillHexStyle(cat.type === "fixed" ? "fijo" : "variable")}
                            >
                              {cat.type === "fixed" ? "Fijo" : "Variable"}
                            </span>
                            <span className="min-w-0 text-[13px] font-semibold leading-snug text-orbita-primary">
                              {cat.name}
                            </span>
                          </div>
                          <div className="mt-2 grid grid-cols-1 gap-3 sm:grid-cols-2">
                            <div className="rounded-lg border border-orbita-border/45 bg-orbita-surface-alt/25 px-2.5 py-2">
                              <p className="text-[9px] font-semibold uppercase tracking-wide text-orbita-secondary">
                                Hecho (mes)
                              </p>
                              <p className="mt-0.5 tabular-nums text-sm font-semibold text-orbita-primary">
                                ${Math.abs(cat.total).toLocaleString("es-CO", { maximumFractionDigits: 0 })}
                              </p>
                              <BudgetUseMeter
                                type={cat.type}
                                pct={cat.budgetUsedPercent}
                                status={cat.budgetStatus}
                              />
                            </div>
                            <div className="rounded-lg border border-orbita-border/45 bg-orbita-surface-alt/25 px-2.5 py-2">
                              <p className="text-[9px] font-semibold uppercase tracking-wide text-orbita-secondary">
                                Prom. 6m
                              </p>
                              <div className="mt-0.5">
                                <BudgetRollingSixMonthCell
                                  stat={rollingSixMonthByBudgetKey[ck]}
                                  assignedCap={budgetDraft.category[ck]}
                                />
                              </div>
                            </div>
                          </div>
                          <label className="mt-2 grid gap-1">
                            <span className="text-[9px] font-medium text-orbita-muted">Tope categoría (COP)</span>
                            <input
                              key={`cat-inp-mob-${ck}-${budgetRevision}`}
                              type="text"
                              inputMode="numeric"
                              placeholder="Estimación auto"
                              defaultValue={
                                budgetDraft.category[ck] != null ? String(budgetDraft.category[ck]) : ""
                              }
                              onBlur={(e) => commitCategoryBudget(cat, e.target.value)}
                              className="w-full min-w-0 rounded-md border border-[color-mix(in_srgb,var(--color-accent-finance)_42%,var(--color-border))] bg-[color-mix(in_srgb,var(--color-surface)_92%,transparent)] px-2 py-2 text-[12px] font-medium tabular-nums text-orbita-primary shadow-sm outline-none transition placeholder:text-orbita-muted/70 focus:border-[color-mix(in_srgb,var(--color-accent-finance)_58%,var(--color-border))] focus:ring-1 focus:ring-[color-mix(in_srgb,var(--color-accent-finance)_30%,transparent)]"
                              aria-label={`Presupuesto categoría ${cat.name}`}
                            />
                          </label>
                          {(cat.subcategories ?? []).map((sub) => {
                            const sk = subcategoryBudgetKey(cat.type, cat.name, sub.name)
                            return (
                              <div
                                key={`mob-sub-${sk}`}
                                className="mt-3 border-t border-orbita-border/45 pt-3"
                              >
                                <p className="text-[10px] font-semibold text-orbita-primary">
                                  <span className="text-orbita-secondary">Sub · </span>
                                  {sub.name}
                                </p>
                                <div className="mt-1.5 grid grid-cols-1 gap-2 sm:grid-cols-2">
                                  <div>
                                    <p className="text-[9px] text-orbita-secondary">Hecho (mes)</p>
                                    <p className="tabular-nums text-[12px] text-orbita-secondary">
                                      ${Math.abs(sub.total).toLocaleString("es-CO", { maximumFractionDigits: 0 })}
                                    </p>
                                    <SubBudgetMonthLedger
                                      spentAbs={Math.abs(sub.total)}
                                      capCop={budgetDraft.subcategory[sk]}
                                    />
                                  </div>
                                  <div>
                                    <p className="text-[9px] text-orbita-secondary">Prom. 6m</p>
                                    <BudgetRollingSixMonthCell
                                      stat={rollingSixMonthByBudgetKey[sk]}
                                      assignedCap={budgetDraft.subcategory[sk]}
                                    />
                                  </div>
                                </div>
                                <label className="mt-2 grid gap-1">
                                  <span className="text-[9px] font-medium text-orbita-muted">Tope sub (COP)</span>
                                  <input
                                    key={`sub-inp-mob-${sk}-${budgetRevision}`}
                                    type="text"
                                    inputMode="numeric"
                                    placeholder="Opcional"
                                    defaultValue={
                                      budgetDraft.subcategory[sk] != null
                                        ? String(budgetDraft.subcategory[sk])
                                        : ""
                                    }
                                    onBlur={(e) => commitSubcategoryBudget(cat, sub.name, e.target.value)}
                                    className="w-full min-w-0 rounded border border-dashed border-[color-mix(in_srgb,var(--color-border)_65%,transparent)] bg-[color-mix(in_srgb,var(--color-text-primary)_3%,transparent)] px-2 py-1.5 text-[11px] tabular-nums text-orbita-primary outline-none transition focus:border-[color-mix(in_srgb,var(--color-accent-finance)_48%,var(--color-border))] focus:ring-1 focus:ring-[color-mix(in_srgb,var(--color-accent-finance)_24%,transparent)]"
                                    aria-label={`Presupuesto subcategoría ${sub.name}`}
                                  />
                                </label>
                              </div>
                            )
                          })}
                        </div>
                      )
                    })}
                  </div>
                  <div className="hidden touch-pan-x overflow-x-auto overscroll-x-contain rounded-[11px] border border-orbita-border/45 bg-orbita-surface [-webkit-overflow-scrolling:touch] [scrollbar-gutter:stable] shadow-[inset_0_1px_0_0_color-mix(in_srgb,var(--color-text-primary)_7%,transparent)] md:block md:touch-pan-x">
                  <table className="table-fixed w-full min-w-[700px] border-collapse text-left text-[9px] leading-tight sm:min-w-[820px] sm:text-[10px]">
                    <caption className="sr-only">
                      Presupuestos por categoría y subcategoría: gasto del mes, promedio mensual últimos seis meses en COP,
                      diferencia opcional vs tope guardado, y tope editable en pesos colombianos
                    </caption>
                    <colgroup>
                      <col style={{ width: "12%" }} />
                      <col style={{ width: "30%" }} />
                      <col style={{ width: "17%" }} />
                      <col style={{ width: "13%" }} />
                      <col style={{ width: "28%" }} />
                    </colgroup>
                    <thead>
                      <tr className="border-b-2 border-orbita-border/65 bg-[color-mix(in_srgb,var(--color-text-primary)_7%,var(--color-surface-alt))] text-[9px] uppercase tracking-[0.12em] text-orbita-primary/95 sm:text-[10px]">
                        <th scope="col" className="px-2 py-1.5 text-left font-semibold sm:px-3">
                          Tipo
                        </th>
                        <th scope="col" className="px-2 py-1.5 text-left font-semibold sm:px-3">
                          Nombre
                        </th>
                        <th scope="col" className="px-2 py-1.5 text-right font-semibold tabular-nums sm:px-3">
                          Hecho (mes)
                        </th>
                        <th
                          scope="col"
                          className="px-2 py-1.5 text-right font-semibold tabular-nums sm:px-3"
                        >
                          <abbr
                            title="Promedio mensual neto en COP (últimos 6 meses, redondeado). Si hay tope en esta fila, debajo: diferencia de ese promedio menos el tope."
                            className="cursor-help no-underline"
                          >
                            Prom. 6m
                          </abbr>
                        </th>
                        <th scope="col" className="min-w-[8rem] px-2 py-1.5 text-left font-semibold sm:px-3">
                          <abbr title="Tope en pesos colombianos — editable" className="cursor-help no-underline">
                            Tope (COP)
                          </abbr>
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {sortedBudgetCategoriesForOperativa.flatMap((cat, catIdx) => {
                          const ck = categoryBudgetKey(cat.type, cat.name)
                          const prevCat = catIdx > 0 ? sortedBudgetCategoriesForOperativa[catIdx - 1] : null
                          const tipoSectionBreak =
                            prevCat != null && prevCat.type !== cat.type ? "border-t-2 border-orbita-border/55" : ""
                          const blockSeparator = catIdx > 0 && !tipoSectionBreak ? "border-t border-orbita-border/45" : ""
                          const catRow = (
                            <tr
                              key={`c-${ck}`}
                              className={cn(
                                "border-b border-orbita-border/40 transition-[box-shadow] duration-200",
                                "hover:shadow-[inset_0_0_0_9999px_color-mix(in_srgb,var(--color-accent-finance)_7%,transparent)]",
                                tipoSectionBreak,
                                blockSeparator,
                              )}
                              style={budgetTableRowSurface(cat.type, "category")}
                            >
                              <td className="border-b border-orbita-border/35 px-2 py-1.5 align-middle sm:px-3">
                                <span
                                  className="inline-flex min-w-[4.5rem] shrink-0 justify-center rounded-full px-2 py-px text-[8px] font-bold uppercase tracking-wide shadow-[0_1px_2px_rgba(15,23,42,0.06)] sm:min-w-[5rem] sm:py-0.5 sm:text-[9px]"
                                  style={sheetTipoPillHexStyle(cat.type === "fixed" ? "fijo" : "variable")}
                                >
                                  {cat.type === "fixed" ? "Fijo" : "Variable"}
                                </span>
                              </td>
                              <td className="border-b border-orbita-border/35 px-2 py-1.5 align-middle font-semibold text-orbita-primary sm:px-3">
                                {cat.name}
                              </td>
                              <td className="border-b border-orbita-border/35 px-2 py-1.5 align-middle text-right sm:px-3">
                                <div className="flex flex-col items-end gap-0">
                                  <span className="tabular-nums text-xs font-semibold text-orbita-primary sm:text-[13px]">
                                    ${Math.abs(cat.total).toLocaleString("es-CO", { maximumFractionDigits: 0 })}
                                  </span>
                                  <BudgetUseMeter
                                    type={cat.type}
                                    pct={cat.budgetUsedPercent}
                                    status={cat.budgetStatus}
                                  />
                                </div>
                              </td>
                              <td className="border-b border-orbita-border/35 px-2 py-1.5 align-middle text-right sm:px-3">
                                <BudgetRollingSixMonthCell
                                  stat={rollingSixMonthByBudgetKey[ck]}
                                  assignedCap={budgetDraft.category[ck]}
                                />
                              </td>
                              <td className="border-b border-orbita-border/35 px-2 py-1.5 align-middle sm:px-3">
                                <input
                                  key={`cat-inp-${ck}-${budgetRevision}`}
                                  type="text"
                                  inputMode="numeric"
                                  placeholder="Estimación auto"
                                  defaultValue={
                                    budgetDraft.category[ck] != null ? String(budgetDraft.category[ck]) : ""
                                  }
                                  onBlur={(e) => commitCategoryBudget(cat, e.target.value)}
                                  className="w-full min-w-0 rounded-md border border-[color-mix(in_srgb,var(--color-accent-finance)_42%,var(--color-border))] bg-[color-mix(in_srgb,var(--color-surface)_92%,transparent)] px-2 py-1 text-[11px] font-medium tabular-nums text-orbita-primary shadow-sm outline-none transition placeholder:text-orbita-muted/70 focus:border-[color-mix(in_srgb,var(--color-accent-finance)_58%,var(--color-border))] focus:ring-1 focus:ring-[color-mix(in_srgb,var(--color-accent-finance)_30%,transparent)] sm:text-xs"
                                  aria-label={`Presupuesto categoría ${cat.name}`}
                                />
                              </td>
                            </tr>
                          )
                          const subRows = (cat.subcategories ?? []).map((sub) => {
                            const sk = subcategoryBudgetKey(cat.type, cat.name, sub.name)
                            return (
                              <tr
                                key={`s-${sk}`}
                                className="border-b border-orbita-border/35 transition-[box-shadow] duration-200 hover:shadow-[inset_0_0_0_9999px_color-mix(in_srgb,var(--color-accent-finance)_5%,transparent)]"
                                style={budgetTableRowSurface(cat.type, "sub")}
                              >
                                <td className="border-b border-orbita-border/30 px-2 py-1 sm:w-[14%] sm:px-3" />
                                <td className="border-b border-orbita-border/35 px-2 py-1 pl-4 text-orbita-secondary sm:px-3 sm:pl-6">
                                  <span className="text-[9px] font-semibold uppercase tracking-[0.06em] text-orbita-secondary/85">
                                    Sub
                                  </span>{" "}
                                  <span className="text-[11px] text-orbita-primary">{sub.name}</span>
                                </td>
                                <td className="border-b border-orbita-border/30 px-2 py-1 text-right sm:px-3">
                                  <div className="flex flex-col items-end gap-0">
                                    <span className="tabular-nums text-[11px] text-orbita-secondary sm:text-xs">
                                      ${Math.abs(sub.total).toLocaleString("es-CO", { maximumFractionDigits: 0 })}
                                    </span>
                                    <SubBudgetMonthLedger
                                      spentAbs={Math.abs(sub.total)}
                                      capCop={budgetDraft.subcategory[sk]}
                                    />
                                  </div>
                                </td>
                                <td className="border-b border-orbita-border/30 px-2 py-1 text-right sm:px-3">
                                  <BudgetRollingSixMonthCell
                                    stat={rollingSixMonthByBudgetKey[sk]}
                                    assignedCap={budgetDraft.subcategory[sk]}
                                  />
                                </td>
                                <td className="border-b border-orbita-border/30 px-2 py-1 sm:px-3">
                                  <input
                                    key={`sub-inp-${sk}-${budgetRevision}`}
                                    type="text"
                                    inputMode="numeric"
                                    placeholder="Opcional"
                                    defaultValue={
                                      budgetDraft.subcategory[sk] != null ? String(budgetDraft.subcategory[sk]) : ""
                                    }
                                    onBlur={(e) => commitSubcategoryBudget(cat, sub.name, e.target.value)}
                                    className="w-full min-w-0 rounded border border-dashed border-[color-mix(in_srgb,var(--color-border)_65%,transparent)] bg-[color-mix(in_srgb,var(--color-text-primary)_3%,transparent)] px-1.5 py-px text-[10px] tabular-nums text-orbita-primary outline-none transition focus:border-[color-mix(in_srgb,var(--color-accent-finance)_48%,var(--color-border))] focus:ring-1 focus:ring-[color-mix(in_srgb,var(--color-accent-finance)_24%,transparent)] sm:py-0.5"
                                    aria-label={`Presupuesto subcategoría ${sub.name}`}
                                  />
                                </td>
                              </tr>
                            )
                          })
                          return [catRow, ...subRows]
                        })}
                    </tbody>
                  </table>
                  </div>
                </div>
              </div>
            </details>
          </Card>
        </div>
      )}
    </div>
  )
}
