export function financialPredictionEngine({
  totalStructural,
}: {
  totalStructural: number
}) {
  const absTotal = Math.abs(totalStructural)

  if (absTotal === 0) {
    return {
      dailyAverage: 0,
      projectedEndOfMonth: 0,
      warning: false,
    }
  }

  const today = new Date()
  const currentDay = today.getDate()

  const daysInMonth = new Date(
    today.getFullYear(),
    today.getMonth() + 1,
    0
  ).getDate()

  const dailyAverage = absTotal / currentDay

  const projectedEndOfMonth = Math.round(
    dailyAverage * daysInMonth
  )

  const warning =
    currentDay < 15 &&
    projectedEndOfMonth > absTotal * 1.3

  return {
    dailyAverage: Math.round(dailyAverage),
    projectedEndOfMonth,
    warning,
  }
}
