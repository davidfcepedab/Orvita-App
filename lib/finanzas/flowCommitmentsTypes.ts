export type FlowCommitmentFlowType = "fixed" | "one-time" | "recurring" | "income"

export type FlowCommitment = {
  id: string
  title: string
  category: string
  subcategory: string
  /** Día del mes (1–31), permanente para todos los meses. */
  dueDay: number
  /** Fecha anclada al mes visible (YYYY-MM-DD) para listas y orden. */
  date: string
  amount: number
  flowType: FlowCommitmentFlowType
}
