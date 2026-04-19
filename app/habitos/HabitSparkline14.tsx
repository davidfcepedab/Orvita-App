"use client"

/**
 * Mini barras: 14 días (antiguo → hoy). `null` = día no programado (marca tenue).
 */
export function HabitSparkline14({ values }: { values: Array<0 | 1 | null> }) {
  if (!values.length) {
    return (
      <span className="inline-block min-w-[3ch] text-center text-[10px] text-[var(--color-text-secondary)]" aria-hidden>
        —
      </span>
    )
  }
  const w = 56
  const h = 16
  const n = values.length
  const step = w / n

  return (
    <svg
      width={w}
      height={h}
      viewBox={`0 0 ${w} ${h}`}
      className="shrink-0 text-[var(--color-text-secondary)]"
      aria-hidden
    >
      {values.map((v, i) => {
        const x = i * step + step * 0.18
        const bw = Math.max(1.5, step * 0.64)
        if (v === null) {
          return (
            <rect
              key={i}
              x={x}
              y={h * 0.72}
              width={bw}
              height={1.25}
              rx={0.5}
              fill="currentColor"
              opacity={0.14}
            />
          )
        }
        if (v === 1) {
          return (
            <rect
              key={i}
              x={x}
              y={h * 0.12}
              width={bw}
              height={h * 0.52}
              rx={1}
              fill="var(--color-accent-health)"
              opacity={0.88}
            />
          )
        }
        return (
          <rect
            key={i}
            x={x}
            y={h * 0.38}
            width={bw}
            height={h * 0.52}
            rx={1}
            fill="var(--color-accent-danger)"
            opacity={0.42}
          />
        )
      })}
    </svg>
  )
}
