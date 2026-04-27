"use client"

import { Bar, BarChart, CartesianGrid, Cell, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"

export type KcalDayPoint = { day: string; kcal: number; targetKcal?: number }

export function KcalBarChart({ chartData, kcalTargetBar }: { chartData: KcalDayPoint[]; kcalTargetBar: number }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={chartData} margin={{ top: 16, right: 4, left: -28, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
        <XAxis dataKey="day" tick={{ fontSize: 10, fill: "#64748b" }} axisLine={false} tickLine={false} />
        <YAxis hide />
        {kcalTargetBar > 0 ? <ReferenceLine y={kcalTargetBar} stroke="#93c5fd" strokeDasharray="5 4" strokeWidth={1} /> : null}
        <Tooltip
          cursor={{ fill: "rgba(148,163,184,0.08)" }}
          contentStyle={{ borderRadius: 12, border: "1px solid #e2e8f0", fontSize: 11 }}
          content={({ active, payload }) => {
            if (!active || !payload?.length) return null
            const row = payload[0].payload as KcalDayPoint
            const v = row.kcal
            const t = row.targetKcal
            return (
              <div className="rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 text-[11px] shadow-sm">
                <p className="m-0 font-semibold text-slate-800">{row.day}</p>
                <p className="m-0 mt-0.5 tabular-nums text-slate-600">
                  Registrado: {v} kcal
                  {t != null && t > 0 ? (
                    <>
                      <br />
                      Objetivo día: {t} kcal
                    </>
                  ) : null}
                </p>
              </div>
            )
          }}
        />
        <Bar dataKey="kcal" radius={[8, 8, 0, 0]}>
          {chartData.map((e) => {
            const t = e.targetKcal ?? (kcalTargetBar > 0 ? kcalTargetBar : 0)
            const fill = t > 0 && e.kcal >= t * 0.95 ? "#3b82f6" : "#e2e8f0"
            return <Cell key={e.day} fill={fill} />
          })}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}
