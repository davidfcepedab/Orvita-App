"use client"

import { AppShell } from "@/src/components/layout/AppShell"
import { Card } from "@/src/components/ui/Card"
import { useHealthMock } from "@/src/modules/health/useHealthMock"
import { calculateRecovery } from "@/src/modules/health/recoveryEngine"

const supplements = [
  { name: "Creatine Monohydrate", amount: "5g", active: true },
  { name: "Vitamin D3 + K2", amount: "5000 IU", active: true },
  { name: "Omega-3 (EPA/DHA)", amount: "2g", active: true },
  { name: "Magnesium L-Threonate", amount: "200mg", active: false },
  { name: "Zinc + Magnesium (ZMA)", amount: "1 capsule", active: false },
  { name: "Ashwagandha", amount: "300mg", active: false },
]

export default function HealthPage() {
  const data = useHealthMock()
  const recovery = calculateRecovery({
    sleepHours: data.sleepHours,
    sleepQuality: data.sleepQuality,
    anxietyLevel: data.anxietyLevel,
    trainedToday: data.trainedToday,
  })

  const sleepScore = Math.round((data.sleepQuality / 5) * 100)
  const recoveryScore = recovery.score

  return (
    <AppShell moduleLabel="Health Module" moduleTitle="Health Operations" showSidebar={false}>
      <div style={{ display: "grid", gap: "var(--spacing-lg)" }}>
        <div>
          <h1 style={{ margin: 0, fontSize: "28px", fontWeight: 500 }}>Health Operations</h1>
          <p style={{ margin: "6px 0 0", fontSize: "13px", color: "var(--color-text-secondary)" }}>
            Bio-telemetry, fuel management, and energy optimization
          </p>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(5, minmax(0, 1fr))", gap: "var(--layout-gap)" }}>
          {[
            { label: "HRV", value: "68", unit: "ms", accent: "var(--color-accent-warning)" },
            { label: "Resting HR", value: "52", unit: "bpm", accent: "var(--color-accent-danger)" },
            { label: "Sleep Score", value: `${sleepScore}`, unit: "", accent: "var(--color-accent-health)" },
            { label: "Recovery", value: `${recoveryScore}`, unit: "%", accent: "var(--color-accent-warning)" },
            { label: "Body Battery", value: "71", unit: "%", accent: "var(--color-accent-warning)" },
          ].map((metric) => (
            <Card key={metric.label} hover>
              <div style={{ padding: "var(--spacing-md)", display: "grid", gap: "6px" }}>
                <p style={{ margin: 0, fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.14em", color: "var(--color-text-secondary)" }}>
                  {metric.label}
                </p>
                <p style={{ margin: 0, fontSize: "22px", fontWeight: 600, color: metric.accent }}>
                  {metric.value}
                  <span style={{ fontSize: "12px", color: "var(--color-text-secondary)" }}> {metric.unit}</span>
                </p>
              </div>
            </Card>
          ))}
        </div>

        <Card>
          <div style={{ padding: "var(--spacing-md)", display: "grid", gap: "var(--spacing-md)" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div>
                <p style={{ margin: 0, fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.14em", color: "var(--color-text-secondary)" }}>
                  Fuel Dashboard (Bio-hacking Stack)
                </p>
                <p style={{ margin: "4px 0 0", fontSize: "12px", color: "var(--color-text-secondary)" }}>3/6 Protocols</p>
              </div>
              <button style={{ padding: "6px 10px", borderRadius: "10px", border: "0.5px solid var(--color-border)", background: "var(--color-surface-alt)", fontSize: "11px" }}>
                Editar Stack
              </button>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(6, minmax(0, 1fr))", gap: "var(--spacing-md)" }}>
              {supplements.map((item) => (
                <div key={item.name} style={{ textAlign: "center", display: "grid", gap: "6px" }}>
                  <div
                    style={{
                      width: "36px",
                      height: "36px",
                      margin: "0 auto",
                      borderRadius: "999px",
                      border: `2px solid ${item.active ? "var(--color-accent-health)" : "var(--color-border)"}`,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: item.active ? "var(--color-accent-health)" : "var(--color-text-secondary)",
                    }}
                  >
                    ●
                  </div>
                  <p style={{ margin: 0, fontSize: "11px", fontWeight: 500 }}>{item.name}</p>
                  <p style={{ margin: 0, fontSize: "10px", color: "var(--color-text-secondary)" }}>{item.amount}</p>
                </div>
              ))}
            </div>
          </div>
        </Card>

        <Card>
          <div style={{ padding: "var(--spacing-lg)", display: "grid", gap: "var(--spacing-md)" }}>
            <p style={{ margin: 0, fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.14em", color: "var(--color-text-secondary)" }}>
              Biometric Correlation: Sleep vs Daily Energy
            </p>
            <div style={{ height: "220px", borderRadius: "12px", background: "var(--color-surface-alt)", border: "0.5px solid var(--color-border)" }} />
          </div>
        </Card>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: "var(--layout-gap)" }}>
          <Card>
            <div style={{ padding: "var(--spacing-md)", display: "grid", gap: "6px" }}>
              <p style={{ margin: 0, fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.14em", color: "var(--color-text-secondary)" }}>
                Hydration
              </p>
              <p style={{ margin: 0, fontSize: "22px", fontWeight: 600 }}>{data.hydrationLiters} / 3.2L</p>
              <div style={{ height: "6px", borderRadius: "999px", background: "var(--color-border)" }}>
                <div style={{ height: "6px", borderRadius: "999px", width: "70%", background: "var(--color-accent-primary)" }} />
              </div>
            </div>
          </Card>
          <Card>
            <div style={{ padding: "var(--spacing-md)", display: "grid", gap: "6px" }}>
              <p style={{ margin: 0, fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.14em", color: "var(--color-text-secondary)" }}>
                Macronutrients
              </p>
              {[
                { label: "Protein", value: "142 / 165g", color: "var(--color-accent-warning)" },
                { label: "Carbs", value: "218 / 240g", color: "var(--color-accent-primary)" },
                { label: "Fats", value: "68 / 75g", color: "var(--color-accent-health)" },
              ].map((macro) => (
                <div key={macro.label} style={{ display: "grid", gap: "6px" }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <span style={{ fontSize: "12px" }}>{macro.label}</span>
                    <span style={{ fontSize: "11px", color: "var(--color-text-secondary)" }}>{macro.value}</span>
                  </div>
                  <div style={{ height: "6px", borderRadius: "999px", background: "var(--color-border)" }}>
                    <div style={{ height: "6px", borderRadius: "999px", width: "70%", background: macro.color }} />
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </AppShell>
  )
}
