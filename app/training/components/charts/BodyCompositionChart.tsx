"use client"

import {
  Area,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"

export type BodyCompositionPoint = { label: string; weight: number; fatPct: number }

export function BodyCompositionChart({ chartPoints }: { chartPoints: BodyCompositionPoint[] }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <ComposedChart data={chartPoints} margin={{ top: 10, right: 10, left: 4, bottom: 4 }}>
        <defs>
          <linearGradient id="wAreaTraining" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#6366f1" stopOpacity={0.2} />
            <stop offset="100%" stopColor="#6366f1" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="4 4" stroke="#e2e8f0" vertical={false} />
        <XAxis dataKey="label" tick={{ fontSize: 10, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
        <YAxis
          yAxisId="w"
          orientation="left"
          width={44}
          tick={{ fontSize: 10, fill: "#3b82f6" }}
          axisLine={false}
          tickLine={false}
          tickFormatter={(v) => `${v}kg`}
          domain={["dataMin - 0.5", "dataMax + 0.5"]}
        />
        <YAxis
          yAxisId="f"
          orientation="right"
          width={40}
          tick={{ fontSize: 10, fill: "#fb923c" }}
          axisLine={false}
          tickLine={false}
          tickFormatter={(v) => `${v}%`}
          domain={["dataMin - 0.4", "dataMax + 0.4"]}
        />
        <Tooltip
          contentStyle={{ borderRadius: 12, border: "1px solid #e2e8f0", fontSize: 11 }}
          formatter={(value, name) => {
            const v = typeof value === "number" ? value : Number(value)
            return [String(name) === "weight" ? `${v} kg` : `${v}%`, String(name) === "weight" ? "Peso" : "Grasa"]
          }}
        />
        <Legend wrapperStyle={{ display: "none" }} />
        <Area yAxisId="w" type="monotone" dataKey="weight" stroke="none" fill="url(#wAreaTraining)" />
        <Line
          yAxisId="w"
          type="monotone"
          dataKey="weight"
          name="weight"
          stroke="#3b82f6"
          strokeWidth={2}
          strokeDasharray="4 3"
          dot={{ r: 3, fill: "#3b82f6", strokeWidth: 0 }}
        />
        <Line
          yAxisId="f"
          type="monotone"
          dataKey="fatPct"
          name="fatPct"
          stroke="#fb923c"
          strokeWidth={2}
          dot={{ r: 4, fill: "#fb923c", stroke: "#fff", strokeWidth: 2 }}
        />
      </ComposedChart>
    </ResponsiveContainer>
  )
}
