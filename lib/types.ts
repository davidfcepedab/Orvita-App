// ============================================================
// Movimientos sheet (Movimientos!A2:U5000)
// ============================================================

export interface Transaction {
  fecha: string
  descripcion: string
  categoria: string
  subcategoria: string
  monto: number
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
  subcategories?: Subcategory[]
  budget?: number
  budgetUsedPercent?: number
  budgetStatus?: "green" | "yellow" | "red"
}

// ============================================================
// Base mensual CFO sheet (Base mensual CFO!A2:H1000)
// ============================================================

