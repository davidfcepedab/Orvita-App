/**
 * Tipos para la especificación declarativa `PLStrategicCenter` (docs/finanzas/pl-strategic-center.json).
 * Uso: tipar payloads estáticos, respuestas API o fixtures que repliquen la spec en runtime.
 */

// ─── Catálogo / snapshots — cómo mapear datos reales ─────────────────────────
//
// **orbita_finance_subcategory_catalog**
// - `financial_impact`: clasifica cada subcategoría en una capa semántica (operativo, inversión, etc.).
//   Agrupa y colorea tarjetas de presión; segmenta donuts/barras cuando `groupBy === "financial_impact"`.
//   Normalizar valores de BD al enum/union {@link FinancialImpact} en la capa API o servidor.
// - `expense_type` (`fijo` | `variable`): divide gasto operativo en palancas tácticas vs estructurales;
//   usar en gráficos "fijo vs variable" y tooltips cuando el filtro activo es expense_type.
// - `category` / `subcategory`: etiquetas UI y drill-down; sumar `amount` de transacciones join por
//   `subcategory_id` (o clave equivalente en tu esquema) hacia estas columnas.
// - `budgetable`: si es true y existe línea de presupuesto, calcular brecha presupuesto − actual
//   para chips/reglas de tono en tarjetas de presión.
//
// **finance_monthly_snapshots** (o nombre equivalente en migraciones)
// - Clave lógica: `(year, month)` → `YYYY-MM` alineado con el mes seleccionado en la app.
// - `total_income` / `total_expense`: relleno o KPI agregado cuando hay pocos movimientos en el mes
//   (misma filosofía que Resumen); no sustituye desglose por `financial_impact` salvo aviso explícito
//   de "dato agregado" en UI.

/** Nombre canónico de la vista (JSON `viewName`). */
export type PlStrategicCenterViewName = "PLStrategicCenter"

/** Versión semver de la especificación (JSON `version`). */
export type PlStrategicSpecVersion = `${number}.${number}.${number}`

/** Layout raíz (JSON `layout`). */
export type PlLayoutKind = "scroll"

/** Densidad visual (JSON `density`). */
export type PlDensityKind = "airy" | "comfortable"

/** Espaciado entre secciones (JSON `spacing`). */
export type PlSpacingKind = "apple-generous"

/** Esquema cromático (JSON `colorScheme`). */
export type PlColorSchemeKind = "semantic-minimal-apple"

/**
 * Capa semántica de gasto/resultado según catálogo.
 * @see FinancialImpact — objeto const para valores en runtime.
 */
export enum FinancialImpact {
  Operativo = "operativo",
  Inversion = "inversion",
  Ajuste = "ajuste",
  FinancieroEstructural = "financiero_estructural",
  Otros = "otros",
}

/**
 * Tipo de gasto en catálogo: corto plazo vs compromiso estructural.
 * Mapea `orbita_finance_subcategory_catalog.expense_type`.
 */
export enum ExpenseType {
  Fijo = "fijo",
  Variable = "variable",
}

/** Agrupación del segmented control (JSON `filters.groupBy.options`). */
export enum PlGroupBy {
  FinancialImpact = "financial_impact",
  ExpenseType = "expense_type",
}

/** Escenario de análisis (JSON `filters.scenario.options`). */
export enum PlScenario {
  Real = "real",
  VsPresupuesto = "vs_presupuesto",
  VsMapaOperativo = "vs_mapa_operativo",
}

/**
 * Tipos de gráfico declarados en `charts[]` (JSON `kind`).
 * Extensible si añades más entradas al JSON.
 */
export enum PlChartKind {
  AreaSmoothStackedOrOverlaid = "area-smooth-stacked-or-overlaid",
  Donut = "donut",
  HorizontalBarSorted = "horizontal-bar-sorted",
  PairedHorizontalBars = "paired-horizontal-bars",
  LineMinimal = "line-minimal",
}

/** Subtipo de serie dentro de un chart (p. ej. línea de flujo sobre áreas). */
export enum PlChartSeriesKind {
  Line = "line",
  Area = "area",
}

/** Tono semántico para tarjetas y chips (JSON `tokens.semantic` / reglas de presión). */
export enum PlSemanticTone {
  Pressure = "pressure",
  Attention = "attention",
  Positive = "positive",
  Neutral = "neutral",
}

/** Flecha de variación periodo a periodo (JSON `header.secondary[].presentation.arrow`). */
export enum PlDeltaArrow {
  Up = "up",
  Down = "down",
  Flat = "flat",
}

// ─── Spec raíz ───────────────────────────────────────────────────────────────

export interface PlStrategicCenterSpec {
  readonly viewName: PlStrategicCenterViewName
  readonly version: PlStrategicSpecVersion
  readonly title: string
  readonly subtitle: string
  readonly layout: PlLayoutKind
  readonly density: PlDensityKind
  readonly spacing: PlSpacingKind
  readonly colorScheme: PlColorSchemeKind
  readonly typography: PlTypographySpec
  readonly tokens: PlTokensSpec
  readonly dataSources: PlDataSourceSpec[]
  readonly filters: PlFiltersSpec
  readonly header: PlHeaderSpec
  readonly pressuresSection: PlPressuresSectionSpec
  readonly insightBanner: PlInsightBannerSpec
  readonly charts: PlChartSpec[]
  readonly projectionSection: PlProjectionSectionSpec
  readonly actions: PlActionsBlockSpec
  readonly navigation: PlNavigationSpec
  readonly implementationNotes: PlImplementationNotesSpec
}

export interface PlTypographySpec {
  readonly heroMetric: {
    readonly style: "large-title"
    readonly dynamicType: boolean
    readonly maxLines: number
  }
  readonly sectionTitle: {
    readonly style: "title3"
    readonly weight: "semibold"
  }
  readonly caption: {
    readonly style: "footnote"
    readonly colorToken: "text-secondary"
  }
}

export interface PlSemanticTokenEntry {
  readonly fill: string
  readonly label: string
}

export interface PlTokensSpec {
  readonly semantic: Record<PlSemanticTone, PlSemanticTokenEntry>
  readonly chart: {
    readonly income: string
    readonly expense: string
    readonly net: string
    readonly grid: string
  }
}

/** Entrada de `dataSources` en el JSON (metadocumentación, no fila SQL). */
export type PlDataSourceSpec =
  | PlDataSourceCatalogSpec
  | PlDataSourceTransactionsSpec
  | PlDataSourceSnapshotsSpec

export interface PlDataSourceCatalogSpec {
  readonly id: "catalog"
  readonly table: "orbita_finance_subcategory_catalog"
  readonly fields: {
    readonly category: string
    readonly subcategory: string
    readonly expense_type: string
    readonly financial_impact: string
    readonly budgetable: string
    readonly comment: string
  }
  readonly join: { readonly on: string; readonly note: string }
}

export interface PlDataSourceTransactionsSpec {
  readonly id: "finance_transactions"
  readonly role: "actuals"
  readonly aggregateBy: readonly string[]
}

export interface PlDataSourceSnapshotsSpec {
  readonly id: "finance_monthly_snapshots"
  readonly role: "fallback_kpi_when_sparse_tx"
  readonly fields: readonly ["year", "month", "total_income", "total_expense"]
}

export interface PlFiltersSpec {
  readonly placement: "inline-compact-top"
  readonly period: { readonly type: "month"; readonly binding: "selectedMonthYm" }
  readonly groupBy: {
    readonly options: readonly PlGroupBy[]
    readonly default: PlGroupBy
    readonly control: "segmented-control"
    readonly haptic: "selectionChanged-light"
  }
  readonly scenario: {
    readonly options: readonly PlScenario[]
    readonly note: string
  }
}

// ─── Header ─────────────────────────────────────────────────────────────────

export interface PlHeaderSpec {
  readonly id: string
  readonly type: "large-hero"
  readonly stickyCompactOnScroll: boolean
  readonly primary: PlHeaderPrimaryMetricSpec
  readonly secondary: readonly PlHeaderSecondaryMetricSpec[]
  readonly accessibility: { readonly summaryLabel: string }
}

export interface PlHeaderPrimaryMetricSpec {
  readonly label: string
  readonly binding: { readonly expression: string }
  readonly format: {
    readonly currency: "COP"
    readonly compact: boolean
    readonly showSign: boolean
  }
  readonly semantic: "from-sign-green-rose"
}

export type PlHeaderSecondaryMetricSpec = PlHeaderMomMetricSpec | PlHeaderYtdMetricSpec

export interface PlHeaderMomMetricSpec {
  readonly id: "mom"
  readonly label: "vs mes anterior"
  readonly binding: { readonly deltaAbs: string; readonly deltaPct: string }
  readonly presentation: {
    /** Derivado de signo(delta): positivo → up, negativo → down, ~0 → flat. */
    readonly arrow: PlDeltaArrow
    readonly emphasis: "percent-first-on-narrow"
  }
  readonly interaction: { readonly tap: string }
}

export interface PlHeaderYtdMetricSpec {
  readonly id: "ytd"
  readonly label: "YTD"
  readonly binding: { readonly expression: string }
  readonly format: { readonly currency: "COP"; readonly compact: boolean }
}

// ─── Presiones ──────────────────────────────────────────────────────────────

export interface PlPressuresSectionSpec {
  readonly id: string
  readonly title: string
  readonly subtitle: string
  readonly groupBy: "financial_impact"
  readonly layout: "grid"
  readonly columns: { readonly sm: number; readonly md: number; readonly lg: number }
  readonly maxCards: number
  readonly card: PlPressureCardTemplateSpec
}

export interface PlPressureCardTemplateSpec {
  readonly minHeightPt: number
  readonly cornerRadius: "xl"
  readonly shadow: string
  readonly states: PlPressureCardStatesSpec
  readonly icon: PlPressureCardIconSpec
  readonly content: PlPressureCardContentSpec
  readonly drillDown: PlPressureDrillDownSpec
}

export interface PlPressureCardStatesSpec {
  readonly default: { readonly scale: number }
  readonly hover: { readonly scale: number; readonly shadow: string; readonly durationMs: number }
  readonly pressed: { readonly scale: number; readonly durationMs: number }
  readonly focusVisible: { readonly ring: string }
}

export interface PlPressureCardIconSpec {
  readonly source: "sf-symbol-mapped"
  readonly map: Record<string, string>
}

export interface PlPressureCardContentSpec {
  readonly title: { readonly from: string }
  readonly amount: { readonly from: string; readonly format: string }
  readonly deltaChip: { readonly from: string; readonly tone: string }
  readonly sparkline: {
    readonly enabled: boolean
    readonly series: string
    readonly heightPt: number
    readonly strokeWidthPt: number
  }
  readonly semanticTone: {
    readonly rules: readonly { readonly when: string; readonly tone: string }[]
  }
}

export interface PlPressureDrillDownSpec {
  readonly onTap: string
  readonly sheet: {
    readonly title: string
    readonly rows: {
      readonly from: string
      readonly columns: readonly string[]
      readonly maxRows: number
      readonly rowTap: string
    }
  }
}

// ─── Insight KPI ↔ mapa ─────────────────────────────────────────────────────

export interface PlInsightBannerSpec {
  readonly id: string
  readonly title: string
  readonly binding: { readonly primary: string; readonly secondary: string }
  readonly visibility: string
  readonly actions: readonly PlInsightActionSpec[]
}

export interface PlInsightActionSpec {
  readonly label: string
  readonly href: string
}

// ─── Charts (unión discriminada por `kind` + `id`) ──────────────────────────

export type PlChartSpec =
  | PlIncomeVsExpenseChartSpec
  | PlBreakdownImpactChartSpec
  | PlFixedVsVariableChartSpec
  | PlMonthlyTrendChartSpec

export interface PlIncomeVsExpenseChartSpec {
  readonly id: "income-vs-expense"
  readonly title: string
  readonly kind: PlChartKind.AreaSmoothStackedOrOverlaid
  readonly height: { readonly mobile: number; readonly desktop: number }
  readonly x: { readonly binding: string }
  readonly series: readonly PlChartSeriesSpec[]
  readonly interaction: PlChartInteractionSpec
  readonly empty: { readonly message: string; readonly cta: string }
}

export interface PlChartSeriesSpec {
  readonly key: "ingresos" | "gasto_operativo" | "flujo"
  readonly colorToken: string
  readonly fillOpacity?: number
  readonly kind?: PlChartSeriesKind
  readonly widthPt?: number
}

export interface PlChartInteractionSpec {
  readonly hover: {
    readonly crosshair: "vertical"
    readonly tooltip: readonly string[]
    readonly extraWhenGroupByExpenseType: readonly string[]
  }
}

export interface PlBreakdownImpactChartSpec {
  readonly id: "breakdown-impact"
  readonly title: string
  readonly kind: PlChartKind.Donut
  readonly segmentBy: "financial_impact"
  readonly alternateKind: "horizontal-bar-sorted"
  readonly centerLabel: string
  readonly interaction: {
    readonly segmentTap: string
    readonly hover: string
  }
}

export interface PlFixedVsVariableChartSpec {
  readonly id: "fixed-vs-variable"
  readonly title: string
  readonly kind: PlChartKind.PairedHorizontalBars
  readonly binding: {
    readonly filter: string
    readonly split: "expense_type"
  }
  readonly annotation: string
}

export interface PlMonthlyTrendChartSpec {
  readonly id: "monthly-trend"
  readonly title: string
  readonly kind: PlChartKind.LineMinimal
  readonly metric: "flujo"
  readonly binding: string
}

// ─── Proyección / caja ───────────────────────────────────────────────────────

export interface PlProjectionSectionSpec {
  readonly id: string
  readonly layout: "two-column-stack-on-mobile"
  readonly left: {
    readonly title: string
    readonly binding: readonly string[]
    readonly honestFallback: string
  }
  readonly right: {
    readonly title: string
    readonly chartRef: string
    readonly binding: string
    readonly confidenceBadge: readonly PlConfidenceLevel[]
  }
}

export type PlConfidenceLevel = "baja" | "media" | "alta"

// ─── Acciones y navegación ─────────────────────────────────────────────────

export interface PlActionsBlockSpec {
  readonly maxItems: number
  readonly priority: "impact_score_desc"
  readonly items: readonly PlActionItemSpec[]
}

export interface PlActionItemSpec {
  readonly id: string
  readonly title: string
  /** Condición simbólica evaluada en servidor o motor de reglas (texto de la spec). */
  readonly when: string
  readonly href: string
}

export interface PlNavigationSpec {
  readonly tertiaryLinks: readonly { readonly label: string; readonly href: string }[]
}

export interface PlImplementationNotesSpec {
  readonly apiSuggestion: string
  readonly aggregations: readonly string[]
  readonly coherenceEngine: string
}

// ─── Tipos de datos en runtime (API), no son la spec JSON estática ───────────
// Útiles para implementar GET /api/.../pl-strategic-center

/** Fila agregada por capa semántica para una tarjeta de presión. */
export interface PlRuntimePressureCardData {
  readonly impact: FinancialImpact
  readonly label: string
  readonly amountCop: number
  readonly momPct: number | null
  readonly sparkline: readonly number[]
  readonly tone: PlSemanticTone
}

/** Punto de serie temporal alineado con movimientos o snapshots. */
export interface PlRuntimeFlowMonthPoint {
  readonly monthYm: string
  readonly label: string
  readonly ingresos: number
  readonly gasto_operativo: number
  readonly flujo: number
  readonly pctFijo?: number
  readonly pctVariable?: number
}

/** KPIs del header hero (neto, MoM, YTD). */
export interface PlRuntimeHeroData {
  /** Flujo neto del mes (COP). */
  readonly netCop: number
  /** Delta vs mes calendario anterior (COP). */
  readonly momDeltaCop: number
  /** % sobre |neto mes anterior| cuando aplica; null si base ~0. */
  readonly momDeltaPct: number | null
  /** Acumulado año calendario hasta el mes seleccionado. */
  readonly ytdNetCop: number
}

/** Brecha KPI ↔ mapa para el banner opcional. */
export interface PlRuntimeInsightData {
  readonly primaryCop: number
  readonly secondaryCop: number
  readonly visible: boolean
}

/** Segmento para donut / barras por capa semántica. */
export interface PlRuntimeBreakdownSlice {
  readonly impact: FinancialImpact
  readonly label: string
  readonly valueCop: number
}

/** Reparto fijo vs variable (gasto operativo). */
export interface PlRuntimeFixedVariable {
  readonly fijoCop: number
  readonly variableCop: number
}

/** Proyección simplificada (opcional). */
export interface PlRuntimeProjectionSlice {
  readonly series: readonly { readonly label: string; readonly value: number }[]
  readonly confidence: PlConfidenceLevel
}

/** Acción ya resuelta por servidor/reglas (mostrar en UI). */
export interface PlRuntimeActionResolved {
  readonly id: string
  readonly title: string
  readonly href: string
}

/**
 * Payload que alimenta {@link PLStrategicCenter} junto a {@link PlStrategicCenterSpec}.
 * Construir en cliente tras `GET /api/.../pl-strategic-center` o en loader.
 */
export interface PlStrategicCenterRuntimeData {
  readonly meta: {
    /** Mes activo `YYYY-MM`. */
    readonly monthYm: string
    /** Etiqueta legible (ej. «abril de 2026»). */
    readonly monthLabel: string
  }
  readonly hero: PlRuntimeHeroData
  /** Tarjetas de presión (máx. coherente con spec.pressuresSection.maxCards). */
  readonly pressures: readonly PlRuntimePressureCardData[]
  readonly insightBanner?: PlRuntimeInsightData
  /** Serie ingresos / gasto / flujo (p. ej. últimos 6–12 meses). */
  readonly incomeExpenseSeries: readonly PlRuntimeFlowMonthPoint[]
  /** Gasto por financial_impact para donut. */
  readonly breakdownByImpact: readonly PlRuntimeBreakdownSlice[]
  readonly fixedVsVariable: PlRuntimeFixedVariable
  /** Tendencia de flujo (línea minimal). */
  readonly trendFlujo?: readonly { readonly label: string; readonly flujo: number }[]
  readonly projection?: PlRuntimeProjectionSlice
  /** Flujo de caja mes (si solo hay neto, basta un número). */
  readonly cashMonthNetCop?: number
  /** Acciones priorizadas (≤ spec.actions.maxItems). */
  readonly actions: readonly PlRuntimeActionResolved[]
}

/** Callbacks opcionales para drill-down y telemetría. */
export interface PlStrategicCenterCallbacks {
  readonly onPressureCardClick?: (payload: { impact: FinancialImpact; card: PlRuntimePressureCardData }) => void
  /** Clic en punto de la serie ingresos/gasto/flujo. */
  readonly onIncomeExpenseChartClick?: (payload: { monthYm: string; point: PlRuntimeFlowMonthPoint }) => void
  /** Alias genérico para instrumentación (opcional). */
  readonly onChartClick?: (payload: { chartId: string; monthYm?: string }) => void
  readonly onBreakdownSegmentClick?: (payload: { impact: FinancialImpact; slice: PlRuntimeBreakdownSlice }) => void
  readonly onFixedVariableClick?: (payload: { expenseType: ExpenseType }) => void
  readonly onActionClick?: (payload: { action: PlRuntimeActionResolved }) => void
  readonly onTrendChartClick?: (payload: { label: string; flujo: number }) => void
}

// ─── Alias de nombres cortos (exports solicitados) ───────────────────────────

export type HeaderSpec = PlHeaderSpec
export type PressureCardSpec = PlPressureCardTemplateSpec
export type ChartSpec = PlChartSpec
export type ActionSpec = PlActionItemSpec
export type FiltersSpec = PlFiltersSpec
export type PressuresSectionSpec = PlPressuresSectionSpec
