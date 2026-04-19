"use client"

/**
 * Mini barras: 14 días (antiguo → hoy). `null` = día no programado (marca tenue).
 * Tamaño “roster”: legible en tarjetas; usa viewBox para escalado suave si el padre fija ancho.
 */
export function HabitSparkline14({ values }: { values: Array<0 | 1 | null> }) {
  if (!values.length) {
    return (
      <span className="inline-block min-w-[3ch] text-center text-[10px] text-[var(--color-text-secondary)]" aria-hidden>
        —
      </span>
    )
  }

  const vbW = 112
  const vbH = 26
  const n = values.length
  const step = vbW / n
  const gutter = step * 0.12
  const bw = Math.max(2, step - gutter)

  return (
    <svg
      viewBox={`0 0 ${vbW} ${vbH}`}
      className="h-[26px] w-[min(100%,7.5rem)] min-w-[6.5rem] max-w-[8.5rem] shrink-0 text-[var(--color-text-secondary)]"
      role="img"
      aria-label="Ritmo de 14 días, de más antiguo a más reciente"
    >
      <title>Ritmo 14 días: verde hecho, rojo no hecho, línea baja día sin programar</title>
      {/* pista de fondo */}
      <rect
        x={1}
        y={vbH * 0.78}
        width={vbW - 2}
        height={vbH * 0.12}
        rx={3}
        fill="currentColor"
        opacity={0.08}
      />
      {values.map((v, i) => {
        const x = i * step + gutter * 0.5
        if (v === null) {
          return (
            <rect
              key={i}
              x={x}
              y={vbH * 0.76}
              width={bw}
              height={2}
              rx={1}
              fill="currentColor"
              opacity={0.22}
            />
          )
        }
        if (v === 1) {
          return (
            <rect
              key={i}
              x={x}
              y={vbH * 0.1}
              width={bw}
              height={vbH * 0.62}
              rx={1.5}
              fill="var(--color-accent-health)"
              opacity={1}
              style={{
                filter: "drop-shadow(0 1px 1px color-mix(in srgb, var(--color-accent-health) 35%, transparent))",
              }}
            />
          )
        }
        return (
          <rect
            key={i}
            x={x}
            y={vbH * 0.32}
            width={bw}
            height={vbH * 0.4}
            rx={1.5}
            fill="var(--color-accent-danger)"
            opacity={0.58}
          />
        )
      })}
    </svg>
  )
}
