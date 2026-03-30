export type FlowCommitmentFlowType = "fixed" | "one-time" | "recurring" | "income"

export type FlowCommitment = {
  id: string
  title: string
  category: string
  date: string
  amount: number
  flowType: FlowCommitmentFlowType
}
