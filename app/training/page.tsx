"use client"

import { useEffect, useMemo, useState } from "react"
import { AppShell } from "@/src/components/layout/AppShell"
import { Card } from "@/src/components/ui/Card"
import { Button } from "@/src/components/ui/Button"
import { useTraining } from "@/src/modules/training/useTraining"
import type { TrainingStatus } from "@/src/modules/training/types"

const GOAL_KEY = "orbita:training:goal-image"

function formatStatus(status: TrainingStatus) {
  if (status === "trained") return "Optimal Training Zone"
  if (status === "rest") return "Recovery Focus"
  if (status === "skip") return "Skipped Session"
  return "Swim Session"
}

function intensityLabel(volumeScore?: number) {
  if (!volumeScore) return "Low"
  if (volumeScore >= 250) return "High"
  if (volumeScore >= 140) return "Medium"
  return "Low"
}

export default function TrainingPage() {
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

  const showManual = !today || today.source !== "hevy"

  return (
    <AppShell moduleLabel="Training Module" moduleTitle="Training Operations" showSidebar={false}>
      <div style={{ display: "grid", gap: "var(--spacing-lg)" }}>
        <div>
          <h1 style={{ margin: 0, fontSize: "28px", fontWeight: 500 }}>Training Operations</h1>
          <p style={{ margin: "6px 0 0", fontSize: "13px", color: "var(--color-text-secondary)" }}>
            Hardware maintenance, physical strain, and performance objectives
          </p>
        </div>

        <Card>
          <div style={{ padding: "var(--spacing-lg)", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "var(--spacing-lg)" }}>
            <div style={{ display: "grid", gap: "var(--spacing-sm)" }}>
              <p style={{ margin: 0, fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.14em", color: "var(--color-text-secondary)" }}>
                Daily Capacity
              </p>
              <h2 style={{ margin: 0, fontSize: "22px" }}>{formatStatus(today?.status ?? manualStatus ?? "rest")}</h2>
              <p style={{ margin: 0, fontSize: "12px", color: "var(--color-text-secondary)" }}>
                System recovery at {Math.round(totals.volumeScore / 3)}%. Capacity to absorb strain today.
              </p>
              {showManual && (
                <div style={{ display: "flex", gap: "var(--spacing-sm)", marginTop: "var(--spacing-sm)" }}>
                  <Button onClick={() => setManualStatus("rest")}>Rest</Button>
                  <Button onClick={() => setManualStatus("skip")}>Skip</Button>
                  <Button onClick={() => setManualStatus("swim")}>Swim</Button>
                </div>
              )}
              {error && <p style={{ margin: 0, color: "var(--color-accent-danger)" }}>{error}</p>}
            </div>
            <div
              style={{
                width: "120px",
                height: "120px",
                borderRadius: "50%",
                border: "6px solid color-mix(in srgb, var(--color-accent-primary) 40%, transparent)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                position: "relative",
              }}
            >
              <div
                style={{
                  position: "absolute",
                  width: "96px",
                  height: "96px",
                  borderRadius: "50%",
                  border: "6px solid color-mix(in srgb, var(--color-accent-health) 40%, transparent)",
                }}
              />
              <div style={{ textAlign: "center" }}>
                <p style={{ margin: 0, fontSize: "22px", fontWeight: 600 }}>{Math.max(0, Math.round(totals.volumeScore / 3))}</p>
                <p style={{ margin: 0, fontSize: "10px", color: "var(--color-text-secondary)", textTransform: "uppercase", letterSpacing: "0.12em" }}>Strain</p>
              </div>
            </div>
          </div>
        </Card>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: "var(--layout-gap)" }}>
          <Card>
            <div style={{ padding: "var(--spacing-md)", display: "grid", gap: "var(--spacing-sm)" }}>
              <p style={{ margin: 0, fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.14em", color: "var(--color-text-secondary)" }}>
                Volume & Intensity
              </p>
              <div style={{ height: "180px", borderRadius: "12px", border: "0.5px dashed var(--color-border)", background: "var(--color-surface-alt)" }} />
            </div>
          </Card>
          <Card>
            <div style={{ padding: "var(--spacing-md)", display: "grid", gap: "var(--spacing-sm)" }}>
              <p style={{ margin: 0, fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.14em", color: "var(--color-text-secondary)" }}>
                Strategic Milestones
              </p>
              {[
                { label: "Deadlift 100kg", progress: "85 / 100 KG" },
                { label: "5km Run", progress: "24.2 / 22 MIN" },
              ].map((item) => (
                <div key={item.label} style={{ padding: "10px", borderRadius: "12px", background: "var(--color-surface-alt)" }}>
                  <p style={{ margin: 0, fontSize: "13px", fontWeight: 500 }}>{item.label}</p>
                  <p style={{ margin: "4px 0 0", fontSize: "11px", color: "var(--color-text-secondary)" }}>Current: {item.progress}</p>
                  <div style={{ height: "6px", borderRadius: "999px", background: "var(--color-border)", marginTop: "8px" }}>
                    <div style={{ height: "6px", borderRadius: "999px", width: "70%", background: "var(--color-text-primary)" }} />
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(12, minmax(0, 1fr))", gap: "var(--layout-gap)" }}>
          <div style={{ gridColumn: "span 4" }}>
            <Card>
              <div style={{ padding: "var(--spacing-md)", display: "grid", gap: "var(--spacing-sm)" }}>
                <p style={{ margin: 0, fontSize: "12px", fontWeight: 600 }}>Objetivo Visual & Seguimiento Corporal</p>
                <div
                  style={{
                    height: "220px",
                    borderRadius: "12px",
                    background: "var(--color-surface-alt)",
                    overflow: "hidden",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
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
          <div style={{ gridColumn: "span 8" }}>
            <Card>
              <div style={{ padding: "var(--spacing-md)", display: "grid", gap: "var(--spacing-sm)" }}>
                <p style={{ margin: 0, fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.14em", color: "var(--color-text-secondary)" }}>
                  Estado Actual vs Objetivo
                </p>
                <div style={{ display: "grid", gap: "var(--spacing-sm)" }}>
                  {[
                    { label: "Peso Corporal", value: "78.5 kg", target: "75 kg", progress: "80%" },
                    { label: "% de Grasa", value: "16.5%", target: "12%", progress: "65%" },
                    { label: "Pecho", value: "102 cm", target: "108 cm", progress: "40%" },
                  ].map((row) => (
                    <div key={row.label} style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr", alignItems: "center", gap: "var(--spacing-sm)" }}>
                      <span style={{ fontSize: "13px" }}>{row.label}</span>
                      <span style={{ fontSize: "12px", color: "var(--color-text-secondary)" }}>{row.value}</span>
                      <span style={{ fontSize: "12px", color: "var(--color-text-secondary)" }}>{row.target}</span>
                      <span style={{ fontSize: "12px", color: "var(--color-text-secondary)" }}>{row.progress}</span>
                    </div>
                  ))}
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </AppShell>
  )
}
