import { dayFromIso, isoDateInMonth } from "@/lib/finanzas/commitmentAnchorDate"
import type { FlowCommitment, FlowCommitmentFlowType } from "@/lib/finanzas/flowCommitmentsTypes"

const FLOW_TYPES: FlowCommitmentFlowType[] = ["fixed", "one-time", "recurring", "income"]

export function normalizeFlowTypeDb(v: string): FlowCommitmentFlowType {
  return FLOW_TYPES.includes(v as FlowCommitmentFlowType) ? (v as FlowCommitmentFlowType) : "fixed"
}

export type UserFlowCommitmentRow = {
  id: string
  household_id: string
  title: string
  category: string
  subcategory?: string | null
  due_day?: number | null
  due_date?: string | null
  amount: number | string
  flow_type: string
  created_at?: string
  updated_at?: string
}

export function flowCommitmentFromDbRow(r: UserFlowCommitmentRow, anchorMonth: string): FlowCommitment {
  let dueDay = 1
  if (r.due_day != null && Number.isFinite(Number(r.due_day))) {
    dueDay = Math.min(31, Math.max(1, Math.round(Number(r.due_day))))
  } else if (r.due_date) {
    dueDay = dayFromIso(String(r.due_date))
  }
  const date = isoDateInMonth(anchorMonth, dueDay)
  return {
    id: r.id,
    title: r.title,
    category: r.category ?? "",
    subcategory: r.subcategory ?? "",
    dueDay,
    date,
    amount: Number(r.amount),
    flowType: normalizeFlowTypeDb(String(r.flow_type ?? "fixed")),
  }
}
