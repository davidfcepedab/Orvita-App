"use client"

import {
  createContext,
  useContext,
  useState,
  ReactNode,
  useEffect,
  useCallback,
  useMemo,
  useRef,
  Suspense,
} from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { messageForHttpError } from "@/lib/api/friendlyHttpError"
import { financeApiGet } from "@/lib/finanzas/financeClientFetch"
import type { FinanceModuleMeta } from "@/lib/finanzas/financeModuleMeta"

const supabaseEnabled = process.env.NEXT_PUBLIC_SUPABASE_ENABLED === "true"

export interface FinanceContextType {
  month: string
  setMonth: (month: string) => void
  /**
   * Contador para invalidar KPIs, Cuentas (GET accounts), ledger-accounts y meta al cambiar datos de capital.
   * Llamar tras importar movimientos, conciliación, u otras escrituras que afecten saldos o el mes.
   */
  capitalDataEpoch: number
  touchCapitalData: () => void
  /** KPI / última TX / referencia — misma lógica que overview, vía GET /api/orbita/finanzas/meta */
  financeMeta: FinanceModuleMeta | null
  financeMetaNotice: string | null
  financeMetaLoading: boolean
}

const FinanceContext = createContext<FinanceContextType | null>(null)

export function currentMonthYm(): string {
  const today = new Date()
  return today.toISOString().slice(0, 7)
}

function isValidFinanceMonthYm(s: string): boolean {
  return /^\d{4}-\d{2}$/.test(s.trim())
}

function readMonthFromSearchParams(sp: URLSearchParams): string | null {
  const m = sp.get("month")?.trim()
  return m && isValidFinanceMonthYm(m) ? m : null
}

function FinanceProviderInner({ children }: { children: ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [month, setMonthState] = useState<string>(() => readMonthFromSearchParams(searchParams) ?? currentMonthYm())
  const [capitalDataEpoch, setCapitalDataEpoch] = useState(0)
  const [financeMeta, setFinanceMeta] = useState<FinanceModuleMeta | null>(null)
  const [financeMetaNotice, setFinanceMetaNotice] = useState<string | null>(null)
  const [financeMetaLoading, setFinanceMetaLoading] = useState(false)
  const metaSeq = useRef(0)
  const skipNextUrlSync = useRef(false)
  const monthParamKey = searchParams.get("month")?.trim() ?? ""

  const touchCapitalData = useCallback(() => {
    setCapitalDataEpoch((n) => n + 1)
  }, [])

  useEffect(() => {
    if (skipNextUrlSync.current) {
      skipNextUrlSync.current = false
      return
    }
    if (!isValidFinanceMonthYm(monthParamKey)) return
    setMonthState((prev) => (prev === monthParamKey ? prev : monthParamKey))
  }, [monthParamKey])

  const setMonth = useCallback(
    (ym: string) => {
      const next = ym.trim()
      if (!isValidFinanceMonthYm(next)) return
      skipNextUrlSync.current = true
      setMonthState(next)
      const p = new URLSearchParams(searchParams.toString())
      p.set("month", next)
      const q = p.toString()
      router.replace(q ? `${pathname}?${q}` : pathname, { scroll: false })
    },
    [pathname, router, searchParams],
  )

  useEffect(() => {
    if (!supabaseEnabled || !month) {
      setFinanceMeta(null)
      setFinanceMetaNotice(null)
      setFinanceMetaLoading(false)
      return
    }

    const seq = ++metaSeq.current
    let cancelled = false

    const run = async () => {
      setFinanceMetaLoading(true)
      setFinanceMetaNotice(null)
      try {
        const response = await financeApiGet(
          `/api/orbita/finanzas/meta?month=${encodeURIComponent(month)}`,
        )
        const json = (await response.json()) as {
          success?: boolean
          error?: string
          notice?: string
          meta?: FinanceModuleMeta | null
        }
        if (cancelled || seq !== metaSeq.current) return
        if (!response.ok || !json.success) {
          throw new Error(messageForHttpError(response.status, json.error, response.statusText))
        }
        if (json.notice) setFinanceMetaNotice(json.notice)
        setFinanceMeta(json.meta ?? null)
      } catch {
        if (cancelled || seq !== metaSeq.current) return
        setFinanceMeta(null)
        setFinanceMetaNotice(null)
      } finally {
        if (!cancelled && seq === metaSeq.current) setFinanceMetaLoading(false)
      }
    }

    void run()
    return () => {
      cancelled = true
    }
  }, [month, capitalDataEpoch])

  const value = useMemo(
    () => ({
      month,
      setMonth,
      capitalDataEpoch,
      touchCapitalData,
      financeMeta,
      financeMetaNotice,
      financeMetaLoading,
    }),
    [month, setMonth, capitalDataEpoch, touchCapitalData, financeMeta, financeMetaNotice, financeMetaLoading],
  )

  return <FinanceContext.Provider value={value}>{children}</FinanceContext.Provider>
}

function FinanceModuleSuspenseFallback() {
  return (
    <div className="orbita-page-stack mx-auto min-w-0 w-full max-w-[min(76rem,calc(100vw-1.5rem))] space-y-2 sm:space-y-3">
      <div className="rounded-2xl border border-orbita-border/50 bg-orbita-surface px-4 py-6 text-center text-sm text-orbita-secondary">
        Cargando Capital…
      </div>
    </div>
  )
}

export function FinanceProvider({ children }: { children: ReactNode }) {
  return (
    <Suspense fallback={<FinanceModuleSuspenseFallback />}>
      <FinanceProviderInner>{children}</FinanceProviderInner>
    </Suspense>
  )
}

export function useFinance(): FinanceContextType | null {
  const context = useContext(FinanceContext)

  if (!context) {
    console.warn("useFinance debe ser usado dentro de FinanceProvider")
    return null
  }

  return context
}

export function useFinanceOrThrow(): FinanceContextType {
  const context = useContext(FinanceContext)

  if (!context) {
    throw new Error("useFinance debe ser usado dentro de FinanceProvider")
  }

  return context
}
