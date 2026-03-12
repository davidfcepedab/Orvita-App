// ============================================================
// Movimientos sheet (Movimientos!A2:U5000)
// ============================================================

/** A single row from the Movimientos sheet, fully typed. */
export interface Transaction {
  /** Col A (0) — fecha del movimiento, e.g. "2024-01-15" */
  fecha: string
  /** Col F (5) — descripción del movimiento */
  descripcion: string
  /** Col G (6) — categoría */
  categoria: string
  /** Col H (7) — subcategoría */
  subcategoria: string
  /** Col K (10) — monto (negative = gasto) */
  monto: number
  /** Col M (12) — mes en formato YYYY-MM */
  mes: string
}

// ============================================================
// Category aggregation types
// ============================================================

export interface Subcategory {
  name: string
  total: number
}

export interface Category {
  name: string
  type: "fixed" | "variable"
  total: number
  previousTotal?: number
  delta?: number
  subs?: Subcategory[]
  budget?: number
  budgetUsedPercent?: number
  budgetStatus?: "green" | "yellow" | "red"
}

// ============================================================
// Base mensual CFO sheet (Base mensual CFO!A2:H1000)
// ============================================================

/** A single row from the "Base mensual CFO" sheet. */
export interface CFOMonthlyRow {
  /** Col A (0) — mes en formato YYYY-MM */
  mes: string
  /** Col B (1) — ingresos del mes */
  ingresos: number
  /** Col C (2) — gasto operativo (puede ser negativo) */
  gastoOperativo: number
  /** Col D (3) — gasto financiero (puede ser negativo) */
  gastoFinanciero: number
  /** Col G (6) — flujo total del mes */
  flujoTotal: number
}

// ============================================================
// Cuentas sheet (Cuentas!A2:J200)
// ============================================================

/** Relevant fields from a "Cuentas" row. */
export interface CuentaRow {
  /** Col F (5) — saldo disponible */
  disponible: number
}

// ============================================================
// Presupuesto sheet (Presupuesto!A2:C200)
// ============================================================

/** A single row from the "Presupuesto" sheet. */
export interface BudgetRow {
  /** Col A (0) — nombre de la categoría */
  categoria: string
  /** Col C (2) — monto presupuestado */
  monto: number
}
