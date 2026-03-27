"use client"

import { AppShell } from "@/src/components/layout/AppShell"
import { Card } from "@/src/components/ui/Card"
import { SectionHeader } from "@/src/components/ui/SectionHeader"
import { useLayoutMode } from "@/src/theme/ThemeProvider"
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
      moduleLabel="Health Module"
      moduleTitle="Recovery Engine"
      primaryAction={{ label: "Nuevo Check-in" }}
      metaInfo={`Layout: ${layoutMode}`}
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
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "var(--spacing-md)",
                padding: "var(--spacing-xl)",
              }}
            >
              <span
                style={{
                  width: "10px",
                  height: "10px",
                  borderRadius: designTokens.radius.full,
                  background: statusColor(recovery.status),
                  boxShadow: `0 0 8px ${statusColor(recovery.status)}`,
                }}
              />
              <div>
                <p
                  style={{
                    margin: 0,
                    fontSize: "64px",
                    fontWeight: 500,
                    letterSpacing: "-1px",
                    marginBottom: "var(--spacing-md)",
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
        <div style={{ display: "grid", gap: "var(--layout-gap)" }}>
          <SectionHeader
            title="Recovery Overview"
            description="Visión general del check-in diario"
            gradient
          />
          <div
            style={{
              display: "grid",
              gridTemplateColumns: gridColumns,
              gap: "var(--layout-gap)",
            }}
          >
          <div style={{ gridColumn: isCompact ? "span 4" : "span 6" }}>
            <Card hover shadow={designTokens.elevation["arctic-soft"]}>
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "var(--spacing-md)",
                  padding: "var(--spacing-xl)",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <div>
                    <p style={{ margin: 0, color: "var(--color-text-secondary)" }}>Recovery</p>
                    <p
                      style={{
                        margin: 0,
                        fontSize: "64px",
                        fontWeight: 500,
                        letterSpacing: "-1px",
                        marginBottom: "var(--spacing-md)",
                      }}
                    >
                      {recovery.score}
                    </p>
                  </div>
                  <span
                    style={{
                      width: "10px",
                      height: "10px",
                      borderRadius: designTokens.radius.full,
                      background: statusColor(recovery.status),
                      boxShadow: `0 0 8px ${statusColor(recovery.status)}`,
                    }}
                  />
                </div>
                <div
                  style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: "var(--spacing-sm)" }}
                  >
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
              <div
                style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: "var(--spacing-lg)" }}
              >
                {[
                  { label: "Agua", value: `${data.hydrationLiters}L` },
                  { label: "Meditación", value: `${data.meditationMinutes} min` },
                  { label: "Lectura", value: `${data.readingMinutes} min` },
                  { label: "Ansiedad", value: `${data.anxietyLevel}/5` },
                ].map((item) => (
                  <div key={item.label} style={{ display: "grid", gap: "4px" }}>
                    <p
                      style={{
                        margin: 0,
                        color: "var(--color-text-secondary)",
                        textTransform: "uppercase",
                        fontSize: designTokens.typography.scale.caption["font-size"],
                        letterSpacing: designTokens.typography.scale.caption["letter-spacing"],
                        opacity: 0.5,
                      }}
                    >
                      {item.label}
                    </p>
                    <p style={{ margin: 0, fontWeight: 500, fontSize: "18px" }}>{item.value}</p>
                  </div>
                ))}
              </div>
            </Card>
          </div>

          <div style={{ gridColumn: isCompact ? "span 4" : "span 6" }}>
            <Card hover>
              <h3 style={{ marginTop: 0, fontSize: designTokens.typography.scale.h3["font-size"], fontWeight: 500 }}>
                Social
              </h3>
              <div style={{ display: "grid", gap: "var(--spacing-md)" }}>
                {[
                  { label: "Tiempo en pareja", value: `${data.partnerTimeMinutes} min` },
                  { label: "Calidad conexión", value: `${data.connectionQuality}/5` },
                  { label: "Interacción social", value: `${data.socialInteractions}` },
                ].map((item) => (
                  <div key={item.label} style={{ display: "flex", justifyContent: "space-between", gap: "var(--spacing-md)" }}>
                    <span>{item.label}</span>
                    <span style={{ fontWeight: 500, fontSize: "18px", textAlign: "right", minWidth: "64px" }}>
                      {item.value}
                    </span>
                  </div>
                ))}
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
                  minHeight: "160px",
                  borderTop: "1px dashed var(--color-border)",
                  paddingTop: "var(--spacing-lg)",
                  background: "color-mix(in srgb, var(--color-text-secondary) 2%, transparent)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <span style={{ color: "var(--color-text-secondary)", opacity: 0.6 }}>Tendencia biométrica</span>
              </div>
            </Card>
          </div>
          </div>
        </div>
      )}
    </AppShell>
  )
}
