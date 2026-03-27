"use client"

import { AppShell } from "@/src/components/layout/AppShell"
import { Card } from "@/src/components/ui/Card"
import { Button } from "@/src/components/ui/Button"
import { useTheme, useLayoutMode } from "@/src/theme/ThemeProvider"
import { calculateRecovery } from "@/src/modules/health/recoveryEngine"
import { BiohackingStack } from "@/src/modules/health/BiohackingStack"
import { useHealthMock } from "@/src/modules/health/useHealthMock"
import { designTokens } from "@/src/theme/design-tokens"

function statusColor(status: "optimal" | "stable" | "fragile") {
  if (status === "optimal") return "var(--color-accent-health)"
  if (status === "stable") return "var(--color-accent-warning)"
  return "var(--color-accent-danger)"
}

export default function HealthPage() {
  const { theme } = useTheme()
  const { layoutMode } = useLayoutMode()
  const data = useHealthMock()
  const recovery = calculateRecovery({
    sleepHours: data.sleepHours,
    sleepQuality: data.sleepQuality,
    anxietyLevel: data.anxietyLevel,
    trainedToday: data.trainedToday,
  })

  const isZen = layoutMode === "zen"
  const isCompact = layoutMode === "compact"

  const gridColumns = isCompact ? "repeat(4, minmax(0, 1fr))" : "repeat(12, minmax(0, 1fr))"

  return (
    <AppShell
      sidebar={
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--spacing-md)" }}>
          <div>
            <p
              style={{
                margin: 0,
                fontSize: designTokens.typography.scale.caption["font-size"],
                color: "var(--color-text-secondary)",
              }}
            >
              Health Module
            </p>
            <h2 style={{ margin: 0, fontSize: designTokens.typography.scale.h2["font-size"], fontWeight: 500 }}>
              Recovery Engine
            </h2>
          </div>
          <Button>Nuevo Check-in</Button>
          <p style={{ margin: 0, color: "var(--color-text-secondary)", fontSize: designTokens.typography.scale.caption["font-size"] }}>
            Theme activo: {theme}
          </p>
        </div>
      }
      header={
        <div style={{ display: "flex", alignItems: "center", gap: "var(--spacing-sm)" }}>
          <span style={{ fontSize: designTokens.typography.scale.h3["font-size"], fontWeight: 500 }}>Health</span>
          <span style={{ color: "var(--color-text-secondary)", fontSize: designTokens.typography.scale.caption["font-size"] }}>
            Layout: {layoutMode}
          </span>
        </div>
      }
    >
      {isZen ? (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            minHeight: "60vh",
          }}
        >
          <Card hover shadow={designTokens.elevation["arctic-soft"]}>
            <div style={{ display: "flex", alignItems: "center", gap: "var(--spacing-md)" }}>
              <span
                style={{
                  width: "12px",
                  height: "12px",
                  borderRadius: designTokens.radius.full,
                  background: statusColor(recovery.status),
                }}
              />
              <div>
                <p
                  style={{
                    margin: 0,
                    fontSize: "48px",
                    fontWeight: 500,
                    lineHeight: 1,
                    transition: `all ${designTokens.animation.duration.normal} ${designTokens.animation.easing.default}`,
                  }}
                >
                  {recovery.score}
                </p>
                <p style={{ margin: 0, color: "var(--color-text-secondary)" }}>{recovery.status}</p>
              </div>
            </div>
          </Card>
        </div>
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: gridColumns,
            gap: "var(--layout-gap)",
          }}
        >
          <div style={{ gridColumn: isCompact ? "span 4" : "span 6" }}>
            <Card hover shadow={designTokens.elevation["arctic-soft"]}>
              <div style={{ display: "flex", flexDirection: "column", gap: "var(--spacing-md)" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <div>
                    <p style={{ margin: 0, color: "var(--color-text-secondary)" }}>Recovery</p>
                    <p style={{ margin: 0, fontSize: "48px", fontWeight: 500 }}>{recovery.score}</p>
                  </div>
                  <span
                    style={{
                      width: "10px",
                      height: "10px",
                      borderRadius: designTokens.radius.full,
                      background: statusColor(recovery.status),
                    }}
                  />
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: "var(--spacing-sm)" }}>
                  <div>
                    <p style={{ margin: 0, color: "var(--color-text-secondary)" }}>Sleep Hours</p>
                    <p style={{ margin: 0, fontWeight: 500 }}>{data.sleepHours}h</p>
                  </div>
                  <div>
                    <p style={{ margin: 0, color: "var(--color-text-secondary)" }}>Sleep Quality</p>
                    <p style={{ margin: 0, fontWeight: 500 }}>{data.sleepQuality}/5</p>
                  </div>
                  <div>
                    <p style={{ margin: 0, color: "var(--color-text-secondary)" }}>Anxiety</p>
                    <p style={{ margin: 0, fontWeight: 500 }}>{data.anxietyLevel}/5</p>
                  </div>
                  <div>
                    <p style={{ margin: 0, color: "var(--color-text-secondary)" }}>Training</p>
                    <p style={{ margin: 0, fontWeight: 500 }}>{data.trainedToday ? "Sí" : "No"}</p>
                  </div>
                </div>
              </div>
            </Card>
          </div>

          <div style={{ gridColumn: isCompact ? "span 4" : "span 6" }}>
            <Card hover>
              <h3 style={{ marginTop: 0, fontSize: designTokens.typography.scale.h3["font-size"], fontWeight: 500 }}>
                Biohacking Stack
              </h3>
              <BiohackingStack />
            </Card>
          </div>

          <div style={{ gridColumn: isCompact ? "span 4" : "span 6" }}>
            <Card hover>
              <h3 style={{ marginTop: 0, fontSize: designTokens.typography.scale.h3["font-size"], fontWeight: 500 }}>
                Hydration + Mental
              </h3>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: "var(--spacing-sm)" }}>
                <div>
                  <p style={{ margin: 0, color: "var(--color-text-secondary)" }}>Agua</p>
                  <p style={{ margin: 0, fontWeight: 500 }}>{data.hydrationLiters}L</p>
                </div>
                <div>
                  <p style={{ margin: 0, color: "var(--color-text-secondary)" }}>Meditación</p>
                  <p style={{ margin: 0, fontWeight: 500 }}>{data.meditationMinutes} min</p>
                </div>
                <div>
                  <p style={{ margin: 0, color: "var(--color-text-secondary)" }}>Lectura</p>
                  <p style={{ margin: 0, fontWeight: 500 }}>{data.readingMinutes} min</p>
                </div>
                <div>
                  <p style={{ margin: 0, color: "var(--color-text-secondary)" }}>Ansiedad</p>
                  <p style={{ margin: 0, fontWeight: 500 }}>{data.anxietyLevel}/5</p>
                </div>
              </div>
            </Card>
          </div>

          <div style={{ gridColumn: isCompact ? "span 4" : "span 6" }}>
            <Card hover>
              <h3 style={{ marginTop: 0, fontSize: designTokens.typography.scale.h3["font-size"], fontWeight: 500 }}>
                Social
              </h3>
              <div style={{ display: "grid", gap: "var(--spacing-sm)" }}>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span>Tiempo en pareja</span>
                  <span style={{ fontWeight: 500 }}>{data.partnerTimeMinutes} min</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span>Calidad conexión</span>
                  <span style={{ fontWeight: 500 }}>{data.connectionQuality}/5</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span>Interacción social</span>
                  <span style={{ fontWeight: 500 }}>{data.socialInteractions}</span>
                </div>
              </div>
            </Card>
          </div>

          <div style={{ gridColumn: isCompact ? "span 4" : "span 12" }}>
            <Card>
              <h3 style={{ marginTop: 0, fontSize: designTokens.typography.scale.h3["font-size"], fontWeight: 500 }}>
                Correlation Preview
              </h3>
              <div
                style={{
                  height: "120px",
                  borderBottom: "1px solid var(--color-border)",
                  opacity: 0.4,
                }}
              />
            </Card>
          </div>
        </div>
      )}
    </AppShell>
  )
}
