export function financialPredictionEngine({
  monthlyHistory,
  liquidez,
}: {
  monthlyHistory: number[]
  liquidez: number
}) {
  if (monthlyHistory.length < 3)
    return { projection: [] }

  const avg =
    monthlyHistory.reduce((a, b) => a + b, 0) /
    monthlyHistory.length

  const projection = []

  let remaining = liquidez

  for (let i = 1; i <= 3; i++) {
    remaining -= avg
    projection.push({
      month: `+${i}`,
      projectedBalance: Math.round(remaining),
    })
  }

  return { projection }
}
