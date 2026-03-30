import type { FlowCommitment, FlowCommitmentFlowType } from "@/lib/finanzas/flowCommitmentsTypes"

const LS_KEY = "orbita:flow_commitments:v1"

const FLOW_TYPES: FlowCommitmentFlowType[] = ["fixed", "one-time", "recurring", "income"]

function normalizeFlowType(v: unknown): FlowCommitmentFlowType {
  return FLOW_TYPES.includes(v as FlowCommitmentFlowType) ? (v as FlowCommitmentFlowType) : "fixed"
}

function parseRow(raw: unknown): FlowCommitment | null {
  if (!raw || typeof raw !== "object") return null
  const o = raw as Record<string, unknown>
  const id = typeof o.id === "string" ? o.id : ""
  if (!id) return null
  const title = typeof o.title === "string" ? o.title : ""
  const category = typeof o.category === "string" ? o.category : ""
  const date = typeof o.date === "string" ? o.date.slice(0, 10) : ""
  const amount = Number(o.amount)
  return {
    id,
    title,
    category,
    date,
    amount: Number.isFinite(amount) ? amount : 0,
    flowType: normalizeFlowType(o.flowType),
  }
}

export function readFlowCommitmentsFromLocalStorage(): FlowCommitment[] {
  if (typeof window === "undefined") return []
  try {
    const raw = localStorage.getItem(LS_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed)) return []
    return parsed.map(parseRow).filter((c): c is FlowCommitment => c != null)
  } catch {
    return []
  }
}

export function writeFlowCommitmentsToLocalStorage(rows: FlowCommitment[]) {
  if (typeof window === "undefined") return
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(rows))
  } catch {
    /* ignore quota */
  }
}

export { LS_KEY as FLOW_COMMITMENTS_LS_KEY }
