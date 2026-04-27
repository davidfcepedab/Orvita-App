"use client"

import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"

export type HrvChartPoint = { label: string; hrv: number }

export function HrvAreaChart({ data }: { data: HrvChartPoint[] }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={data} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
        <defs>
          <linearGradient id="hrvFillTraining" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.28} />
            <stop offset="100%" stopColor="#3b82f6" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
        <XAxis dataKey="label" tick={{ fontSize: 9, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
        <YAxis hide domain={["dataMin - 8", "dataMax + 8"]} />
        <Tooltip
          contentStyle={{
            borderRadius: 14,
            border: "1px solid #e2e8f0",
            fontSize: 12,
            boxShadow: "0 8px 30px rgba(15,23,42,0.06)",
          }}
          formatter={(value) => {
            const v = typeof value === "number" ? value : Number(value)
            return [`${Math.round(v)} ms`, "VFC"]
          }}
        />
        <Area type="monotone" dataKey="hrv" stroke="#3b82f6" strokeWidth={1.5} fill="url(#hrvFillTraining)" dot={false} />
      </AreaChart>
    </ResponsiveContainer>
  )
}
