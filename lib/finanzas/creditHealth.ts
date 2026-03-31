export function creditHealthPctFromUsage(usagePct: number): number {
  const u = Number.isFinite(usagePct) ? usagePct : 100
  return Math.max(0, Math.min(100, Math.round(100 - u)))
}

