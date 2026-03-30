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
  due_date: string
  amount: number | string
  flow_type: string
  created_at?: string
  updated_at?: string
}

export function flowCommitmentFromDbRow(r: UserFlowCommitmentRow): FlowCommitment {
  return {
    id: r.id,
    title: r.title,
    category: r.category ?? "",
    date: typeof r.due_date === "string" ? r.due_date.slice(0, 10) : String(r.due_date),
    amount: Number(r.amount),
    flowType: normalizeFlowTypeDb(String(r.flow_type ?? "fixed")),
  }
}
