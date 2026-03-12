import type { Transaction, CFOMonthlyRow, CuentaRow, BudgetRow } from "@/lib/types"
import { mapRowToTransaction } from "@/lib/mappers/transaction.mapper"

// ============================================================
// Movimientos sheet — category-focused projection
// Delegates to mapRowToTransaction to avoid duplicating column
// indices. Use this in the /categories API route.
// ============================================================

/**
 * Maps a raw Movimientos row to a Transaction for category aggregation.
 * Delegates to mapRowToTransaction — column indices are defined there.
 */
export function mapRowToCategoryAggregation(row: any[]): Transaction {
  return mapRowToTransaction(row)
}

// ============================================================
// Base mensual CFO sheet (Base mensual CFO!A2:H1000)
// ============================================================
const CFO_COL_MES = 0
const CFO_COL_INGRESOS = 1
const CFO_COL_GASTO_OPERATIVO = 2
const CFO_COL_GASTO_FINANCIERO = 3
const CFO_COL_FLUJO_TOTAL = 6

/**
 * Returns true if the raw CFO row has enough data to be usable.
 * Keeps row-level validation inside the mapper module.
 */
export function isValidCFORow(row: any[]): boolean {
  return Array.isArray(row) && row.length > 6 && !isNaN(Number(row[CFO_COL_INGRESOS]))
}

/**
 * Maps a raw row from "Base mensual CFO" to a typed CFOMonthlyRow.
 */
export function mapRowToCFOMonthly(row: any[]): CFOMonthlyRow {
  return {
    mes: String(row[CFO_COL_MES] ?? ""),
    ingresos: Number(row[CFO_COL_INGRESOS] ?? 0),
    gastoOperativo: Number(row[CFO_COL_GASTO_OPERATIVO] ?? 0),
    gastoFinanciero: Number(row[CFO_COL_GASTO_FINANCIERO] ?? 0),
    flujoTotal: Number(row[CFO_COL_FLUJO_TOTAL] ?? 0),
  }
}

// ============================================================
// Cuentas sheet (Cuentas!A2:J200)
// ============================================================
const CUENTA_COL_DISPONIBLE = 5

/**
 * Maps a raw row from the "Cuentas" sheet to a typed CuentaRow.
 */
export function mapRowToCuenta(row: any[]): CuentaRow {
  return {
    disponible: Number(row[CUENTA_COL_DISPONIBLE] ?? 0),
  }
}

// ============================================================
// Presupuesto sheet (Presupuesto!A2:C200)
// ============================================================
const PRESUPUESTO_COL_CATEGORIA = 0
const PRESUPUESTO_COL_MONTO = 2

/**
 * Maps a raw row from the "Presupuesto" sheet to a typed BudgetRow.
 */
export function mapRowToBudget(row: any[]): BudgetRow {
  return {
    categoria: String(row[PRESUPUESTO_COL_CATEGORIA] ?? ""),
    monto: Number(row[PRESUPUESTO_COL_MONTO] ?? 0),
  }
}
