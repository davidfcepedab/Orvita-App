/**
 * Presupuestos por categoría/subcategoría (cliente).
 * Modelo lineal: una plantilla mensual (COP/mes) que aplica por igual a todos los meses.
 * Opcional: sincronización con el hogar vía API (tabla `household_finance_category_budgets`).
 */

export type MonthCategoryBudgetsV1 = {
  version: 1
  /** Clave: `${"fixed"|"variable"}|${nombreCategoría}` → COP mensual */
  category: Record<string, number>
  /** Clave: `${"fixed"|"variable"}|${categoría}|${subcategoría}` → COP mensual */
  subcategory: Record<string, number>
}

/** Estado local v2 (plantilla única + metadatos). */
export type LocalCategoryBudgetStoreV2 = {
  version: 2
  /** ISO — última edición local (blur / guardado) */
  updatedAt: string
  template: MonthCategoryBudgetsV1
  /** ISO del remoto la última vez que aplicamos o empujamos (hogar) */
  lastRemoteUpdatedAt: string | null
}

const STORAGE_KEY_V1 = "orbita.financeCategoryBudgets.v1"
const STORAGE_KEY_V2 = "orbita.financeCategoryBudgets.v2"

function emptyMonth(): MonthCategoryBudgetsV1 {
  return { version: 1, category: {}, subcategory: {} }
}

function countEntries(m: MonthCategoryBudgetsV1): number {
  return Object.keys(m.category).length + Object.keys(m.subcategory).length
}

/** True si hay al menos un tope definido en la plantilla. */
export function hasBudgetTemplateContent(template: MonthCategoryBudgetsV1): boolean {
  return countEntries(template) > 0
}

/**
 * Evita pisar ediciones locales o migración v1 al traer el hogar: aplica remoto solo cuando conviene.
 */
export function shouldApplyRemotePull(local: LocalCategoryBudgetStoreV2, remoteUpdatedAt: string): boolean {
  const tRem = new Date(remoteUpdatedAt).getTime()
  const tLastSync = local.lastRemoteUpdatedAt ? new Date(local.lastRemoteUpdatedAt).getTime() : -1
  const tLoc = new Date(local.updatedAt).getTime()
  if (!Number.isFinite(tRem)) return false
  if (tRem <= tLastSync) return false
  if (local.lastRemoteUpdatedAt == null && hasBudgetTemplateContent(local.template)) return false
  const hasLocalChangesAfterSync =
    local.lastRemoteUpdatedAt != null && tLoc > tLastSync + 500
  if (hasLocalChangesAfterSync) return false
  return true
}

/** Migra desde almacenamiento v1 (por mes) eligiendo el mes con más claves definidas. */
function migrateV1ToTemplate(): MonthCategoryBudgetsV1 {
  if (typeof window === "undefined") return emptyMonth()
  try {
    const raw = localStorage.getItem(STORAGE_KEY_V1)
    if (!raw) return emptyMonth()
    const parsed = JSON.parse(raw) as unknown
    if (!parsed || typeof parsed !== "object") return emptyMonth()
    const byMonth = parsed as Record<string, MonthCategoryBudgetsV1>
    let best: MonthCategoryBudgetsV1 = emptyMonth()
    let bestScore = -1
    for (const m of Object.values(byMonth)) {
      if (!m || m.version !== 1) continue
      const score = countEntries(m)
      if (score > bestScore) {
        bestScore = score
        best = {
          version: 1,
          category: { ...m.category },
          subcategory: { ...m.subcategory },
        }
      }
    }
    return best
  } catch {
    return emptyMonth()
  }
}

function readV2(): LocalCategoryBudgetStoreV2 | null {
  if (typeof window === "undefined") return null
  try {
    const raw = localStorage.getItem(STORAGE_KEY_V2)
    if (!raw) return null
    const parsed = JSON.parse(raw) as unknown
    if (!parsed || typeof parsed !== "object") return null
    const o = parsed as Record<string, unknown>
    if (o.version !== 2) return null
    const t = o.template
    if (!t || typeof t !== "object") return null
    const tm = t as MonthCategoryBudgetsV1
    if (tm.version !== 1) return null
    return {
      version: 2,
      updatedAt: typeof o.updatedAt === "string" ? o.updatedAt : new Date().toISOString(),
      template: {
        version: 1,
        category: { ...(tm.category ?? {}) },
        subcategory: { ...(tm.subcategory ?? {}) },
      },
      lastRemoteUpdatedAt: typeof o.lastRemoteUpdatedAt === "string" ? o.lastRemoteUpdatedAt : null,
    }
  } catch {
    return null
  }
}

function writeV2(store: LocalCategoryBudgetStoreV2): void {
  if (typeof window === "undefined") return
  try {
    localStorage.setItem(STORAGE_KEY_V2, JSON.stringify(store))
  } catch {
    // ignore quota
  }
}

export function loadBudgetStore(): LocalCategoryBudgetStoreV2 {
  if (typeof window === "undefined") {
    return {
      version: 2,
      updatedAt: new Date().toISOString(),
      template: emptyMonth(),
      lastRemoteUpdatedAt: null,
    }
  }
  const existing = readV2()
  if (existing) return existing
  const migrated = migrateV1ToTemplate()
  const now = new Date().toISOString()
  const next: LocalCategoryBudgetStoreV2 = {
    version: 2,
    updatedAt: now,
    template: migrated,
    lastRemoteUpdatedAt: null,
  }
  writeV2(next)
  return next
}

/** Reemplaza plantilla local y marca origen remoto (p. ej. tras GET o POST). */
export function applyBudgetTemplateFromRemote(template: MonthCategoryBudgetsV1, remoteUpdatedAt: string): void {
  const base = loadBudgetStore()
  const next: LocalCategoryBudgetStoreV2 = {
    version: 2,
    updatedAt: remoteUpdatedAt,
    template: {
      version: 1,
      category: { ...template.category },
      subcategory: { ...template.subcategory },
    },
    lastRemoteUpdatedAt: remoteUpdatedAt,
  }
  writeV2(next)
}

/** Persiste plantilla tras edición (blur); actualiza fecha de modificación local. */
export function saveBudgetTemplate(template: MonthCategoryBudgetsV1): void {
  const base = loadBudgetStore()
  const now = new Date().toISOString()
  const next: LocalCategoryBudgetStoreV2 = {
    version: 2,
    updatedAt: now,
    template: {
      version: 1,
      category: { ...template.category },
      subcategory: { ...template.subcategory },
    },
    lastRemoteUpdatedAt: base.lastRemoteUpdatedAt,
  }
  writeV2(next)
}

/** Tras guardar en hogar: alinea fechas con el servidor. */
export function markBudgetRemoteSynced(remoteUpdatedAt: string): void {
  const base = loadBudgetStore()
  const next: LocalCategoryBudgetStoreV2 = {
    ...base,
    lastRemoteUpdatedAt: remoteUpdatedAt,
    updatedAt: remoteUpdatedAt,
  }
  writeV2(next)
}

/**
 * Presupuesto efectivo para cualquier mes: misma plantilla lineal (COP/mes repetido).
 * El parámetro `month` se mantiene por compatibilidad con llamadas existentes.
 */
export function loadMonthBudgets(_month: string): MonthCategoryBudgetsV1 {
  const s = loadBudgetStore()
  return {
    version: 1,
    category: { ...s.template.category },
    subcategory: { ...s.template.subcategory },
  }
}

/**
 * @deprecated Usa `saveBudgetTemplate`. El mes se ignora: el modelo es una plantilla para todos los meses.
 */
export function saveMonthBudgets(_month: string, data: MonthCategoryBudgetsV1): void {
  saveBudgetTemplate(data)
}

export function categoryBudgetKey(type: "fixed" | "variable", categoryName: string) {
  return `${type === "fixed" ? "fixed" : "variable"}|${categoryName.trim()}`
}

export function subcategoryBudgetKey(type: "fixed" | "variable", categoryName: string, subName: string) {
  return `${type === "fixed" ? "fixed" : "variable"}|${categoryName.trim()}|${subName.trim()}`
}
