"use client"

import { useEffect, useMemo, useState } from "react"
import type { CSSProperties } from "react"
import { AppShell } from "@/src/components/layout/AppShell"
import { Card } from "@/src/components/ui/Card"
import { Button } from "@/src/components/ui/Button"
import { SectionHeader } from "@/src/components/ui/SectionHeader"
import { useLayoutMode } from "@/src/theme/ThemeProvider"
import { useTraining } from "@/src/modules/training/useTraining"
import type { TrainingStatus } from "@/src/modules/training/types"
import { designTokens } from "@/src/theme/design-tokens"

const GOAL_KEY = "orbita:training:goal-image"

function formatStatus(status: TrainingStatus) {
  if (status === "trained") return "Entrenado"
  if (status === "rest") return "Rest"
  if (status === "skip") return "Skip"
  return "Swim"
}

function intensityLabel(volumeScore?: number) {
  if (!volumeScore) return "Baja"
  if (volumeScore >= 250) return "Alta"
  if (volumeScore >= 140) return "Media"
  return "Baja"
}

export default function TrainingPage() {
  const { layoutMode } = useLayoutMode()
  const { today, loading, error, manualStatus, setManualStatus } = useTraining()
  const [goalUrl, setGoalUrl] = useState("")

  useEffect(() => {
    const stored = window.localStorage.getItem(GOAL_KEY)
    if (stored) setGoalUrl(stored)
  }, [])

  useEffect(() => {
    if (goalUrl) {
      window.localStorage.setItem(GOAL_KEY, goalUrl)
    }
  }, [goalUrl])

  const totals = useMemo(() => {
    return {
      exercises: today?.exerciseCount ?? 0,
      sets: today?.totalSets ?? 0,
      duration: today?.duration ?? 0,
      volumeScore: today?.volumeScore ?? 0,
    }
  }, [today])

  const isZen = layoutMode === "zen"
  const isCompact = layoutMode === "compact"
  const gridColumns = isCompact ? "repeat(4, minmax(0, 1fr))" : "repeat(12, minmax(0, 1fr))"

  const showManual = !today || today.source !== "hevy"
  const sectionGradientStyle = {
    "--section-gradient-start": "var(--color-accent-finance)",
    "--section-gradient-end": "var(--color-accent-agenda)",
  } as CSSProperties

  return (
    <AppShell
      moduleLabel="Training Module"
      moduleTitle="Hevy Sync"
      metaInfo={`Layout: ${layoutMode}`}
    >
      {isZen ? (
        <Card hover>
          <div style={{ display: "flex", flexDirection: "column", gap: "var(--spacing-sm)" }}>
            <p style={{ margin: 0, color: "var(--color-text-secondary)" }}>Today Status</p>
            <p style={{ margin: 0, fontSize: "56px", fontWeight: 500 }}>{formatStatus(today?.status ?? manualStatus ?? "rest")}</p>
          </div>
        </Card>
      ) : (
        <div style={{ display: "grid", gap: "var(--layout-gap)" }}>
          <div style={sectionGradientStyle}>
            <SectionHeader
              title="Training Overview"
              description="Estado diario y carga de entrenamiento"
              gradient
            />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: gridColumns, gap: "var(--layout-gap)" }}>
            <div style={{ gridColumn: isCompact ? "span 4" : "span 6" }}>
              <Card hover>
                <div style={{ display: "flex", flexDirection: "column", gap: "var(--spacing-sm)" }}>
                  <p style={{ margin: 0, color: "var(--color-text-secondary)" }}>Today Status</p>
                  <p style={{ margin: 0, fontSize: "56px", fontWeight: 500 }}>
                    {loading ? "Cargando..." : formatStatus(today?.status ?? manualStatus ?? "rest")}
                  </p>
                  <div style={{ display: "grid", gap: "var(--spacing-xs)" }}>
                    <p style={{ margin: 0 }}>Duración: {totals.duration} min</p>
                    <p style={{ margin: 0 }}>Tipo: {today?.workoutName ?? "Manual"}</p>
                    <p style={{ margin: 0 }}>Intensidad: {intensityLabel(totals.volumeScore)}</p>
                  </div>

                  {showManual && (
                    <div style={{ display: "flex", gap: "var(--spacing-sm)", marginTop: "var(--spacing-sm)" }}>
                      <Button onClick={() => setManualStatus("rest")}>Rest</Button>
                      <Button onClick={() => setManualStatus("skip")}>Skip</Button>
                      <Button onClick={() => setManualStatus("swim")}>Swim</Button>
                    </div>
                  )}

                  {error && <p style={{ margin: 0, color: "var(--color-accent-danger)" }}>{error}</p>}
                </div>
              </Card>
            </div>

            <div style={{ gridColumn: isCompact ? "span 4" : "span 6" }}>
              <Card hover>
                <h3 style={{ marginTop: 0, fontSize: designTokens.typography.scale.h3["font-size"], fontWeight: 500 }}>
                  Volume Overview
                </h3>
                <div style={{ display: "grid", gap: "var(--spacing-sm)" }}>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span>Total exercises</span>
                    <span style={{ fontWeight: 500 }}>{totals.exercises}</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span>Total sets</span>
                    <span style={{ fontWeight: 500 }}>{totals.sets}</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span>Duration</span>
                    <span style={{ fontWeight: 500 }}>{totals.duration} min</span>
                  </div>
                </div>
              </Card>
            </div>

            <div style={{ gridColumn: isCompact ? "span 4" : "span 12" }}>
              <Card>
                <h3 style={{ marginTop: 0, fontSize: designTokens.typography.scale.h3["font-size"], fontWeight: 500 }}>
                  Weekly Trend
                </h3>
                <div
                  style={{
                    height: "120px",
                    borderBottom: "1px solid var(--color-border)",
                    opacity: 0.35,
                  }}
                />
              </Card>
            </div>

            <div style={{ gridColumn: isCompact ? "span 4" : "span 6" }}>
              <Card hover>
                <h3 style={{ marginTop: 0, fontSize: designTokens.typography.scale.h3["font-size"], fontWeight: 500 }}>
                  Visual Goal
                </h3>
                <div style={{ display: "grid", gap: "var(--spacing-sm)" }}>
                  <input
                    value={goalUrl}
                    onChange={(event) => setGoalUrl(event.target.value)}
                    placeholder="Pegue URL de imagen"
                    style={{
                      height: "40px",
                      padding: "0 var(--spacing-sm)",
                      borderRadius: "var(--radius-button)",
                      border: "0.5px solid var(--color-border)",
                      background: "var(--color-surface)",
                      color: "var(--color-text-primary)",
                    }}
                  />
                  <div
                    style={{
                      height: "160px",
                      borderRadius: "var(--radius-card)",
                      border: "0.5px solid var(--color-border)",
                      background: "var(--color-surface-alt)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      overflow: "hidden",
                    }}
                  >
                    {goalUrl ? (
                      <img src={goalUrl} alt="Goal" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    ) : (
                      <span style={{ color: "var(--color-text-secondary)" }}>Sin imagen</span>
                    )}
                  </div>
                </div>
              </Card>
            </div>

            <div style={{ gridColumn: isCompact ? "span 4" : "span 6" }}>
              <Card>
                <h3 style={{ marginTop: 0, fontSize: designTokens.typography.scale.h3["font-size"], fontWeight: 500 }}>
                  Nutrition AI
                </h3>
                <p style={{ margin: 0, color: "var(--color-text-secondary)" }}>
                  Placeholder para recomendaciones de macros.
                </p>
              </Card>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  )
}
