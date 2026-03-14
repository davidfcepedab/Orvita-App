"use client"

import { useEffect, useState } from "react"
import { getContext } from "@/lib/utils/getContext"
import {
  CircularProgressbar,
  buildStyles,
} from "react-circular-progressbar"
import {
  LineChart,
  Line,
  ResponsiveContainer,
} from "recharts"
import "react-circular-progressbar/dist/styles.css"

interface TendenciaItem {
  value: number
}

interface ContextData {
  score_fisico: number
  score_disciplina: number
  score_recuperacion: number
  delta_disciplina: number
  delta_recuperacion: number
  tendencia_7d: TendenciaItem[]
}

export default function Fisico() {
  const [data, setData] = useState<ContextData | null>(null)
  const [animatedValue, setAnimatedValue] = useState(0)

  useEffect(() => {
    const fetchData = async () => {
      const res = await getContext()
      if (!res) return

      setData(res)

      const score = res.score_fisico ?? 0
      let start = 0
      const duration = 800
      const increment = score / (duration / 16)

      const animate = () => {
        start += increment
        if (start >= score) {
          setAnimatedValue(score)
        } else {
          setAnimatedValue(Math.floor(start))
          requestAnimationFrame(animate)
        }
      }

      animate()
    }

    fetchData()
  }, [])

  if (!data) return null

  const tendencia = data.tendencia_7d ?? []

  const average =
    tendencia.length > 0
      ? tendencia.reduce((acc, v) => acc + v.value, 0) /
        tendencia.length
      : 0

  const tendenciaWithAverage = tendencia.map((v) => ({
    value: v.value,
    average,
  }))

  const accent = "#3FC5BB"

  return (
    <div className="space-y-8">

      {/* SCORE RING */}
      <div className="card p-8">
        <div className="w-44 mx-auto">
          <CircularProgressbar
            value={animatedValue}
            strokeWidth={10}
            styles={buildStyles({
              pathColor: accent,
              trailColor: "#E5E7EB",
              textColor: "#111827",
            })}
            text={`${animatedValue}`}
          />
        </div>

        <p className="text-center text-sm text-gray-500 mt-4">
          Score Físico Actual
        </p>
      </div>

      {/* TENDENCIA 7 DÍAS */}
      <div className="card p-6">
        <p className="text-sm text-gray-500 mb-4">
          Tendencia 7 Días
        </p>

        <ResponsiveContainer width="100%" height={120}>
          <LineChart data={tendenciaWithAverage}>
            <Line
              type="monotone"
              dataKey="value"
              stroke={accent}
              strokeWidth={3}
              dot={false}
            />
            <Line
              type="monotone"
              dataKey="average"
              stroke="#94A3B8"
              strokeDasharray="4 4"
              strokeWidth={2}
              dot={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* DISCIPLINA + RECUPERACIÓN */}
      <div className="grid grid-cols-2 gap-4">

        <div className="card text-center p-6">
          <p className="text-xs uppercase tracking-wide text-gray-500">
            Disciplina
          </p>

          <p className="text-3xl font-semibold mt-2">
            {data.score_disciplina}
          </p>

          <p
            className={`text-sm mt-2 ${
              data.delta_disciplina > 0
                ? "text-emerald-500"
                : data.delta_disciplina < 0
                ? "text-red-500"
                : "text-gray-400"
            }`}
          >
            {data.delta_disciplina > 0 && "+"}
            {data.delta_disciplina}% vs semana anterior
          </p>
        </div>

        <div className="card text-center p-6">
          <p className="text-xs uppercase tracking-wide text-gray-500">
            Recuperación
          </p>

          <p className="text-3xl font-semibold mt-2">
            {data.score_recuperacion}
          </p>

          <p
            className={`text-sm mt-2 ${
              data.delta_recuperacion > 0
                ? "text-emerald-500"
                : data.delta_recuperacion < 0
                ? "text-red-500"
                : "text-gray-400"
            }`}
          >
            {data.delta_recuperacion > 0 && "+"}
            {data.delta_recuperacion}% vs semana anterior
          </p>
        </div>

      </div>

    </div>
  )
}
