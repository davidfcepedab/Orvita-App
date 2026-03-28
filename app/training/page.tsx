"use client"

import { useMemo, useRef } from "react"
import {
  CartesianGrid,
  ComposedChart,
  Bar,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"
import { Card } from "@/src/components/ui/Card"
import { useTraining } from "@/src/modules/training/useTraining"
import type { TrainingStatus } from "@/src/modules/training/types"
import { TRAINING_MILESTONES } from "@/app/data/training/visualSeeds"
import { useTrainingPreferences } from "@/app/hooks/useTrainingPreferences"
import { buildAdjustmentHints } from "@/lib/training/adjustmentHints"
import {
  buildMilestoneViews,
  buildWeeklyVolumeIntensity,
  deriveStrainRecovery,
  weeklyVolumeSum,
} from "@/lib/training/deriveFromHevyDays"
import { rechartsDefaultMargin, rechartsTooltipContentStyle } from "@/lib/charts/rechartsShared"
import { isAppMockMode, isSupabaseEnabled } from "@/lib/checkins/flags"
import { TrainingVisualBodySection } from "./TrainingVisualBodySection"

function formatStatus(status: TrainingStatus) {
  if (status === "trained") return "Zona óptima de entrenamiento"
  if (status === "rest") return "Enfoque de recuperación"
  if (status === "skip") return "Sesión pausada"
  return "Sesión de natación"
}

export default function TrainingPage() {
  const { today, days, loading, error, manualStatus, setManualStatus } = useTraining()
  const { bodyRows, mealDays, prefs, setGoalImageUrl, setMealNotes, loading: prefsLoading } = useTrainingPreferences()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const todayIso = useMemo(() => new Date().toISOString().slice(0, 10), [])
  const weekPoints = useMemo(() => buildWeeklyVolumeIntensity(days, todayIso), [days, todayIso])
  const weekSum = useMemo(() => weeklyVolumeSum(weekPoints), [weekPoints])
  const todayVol = today?.volumeScore ?? 0
  const { strain, recoveryPct } = useMemo(
    () => deriveStrainRecovery(todayVol, weekSum),
    [todayVol, weekSum],
  )

  const chartRows = useMemo(
    () => weekPoints.map((p) => ({ name: p.label, volumen: p.volume, intensidad: p.intensity })),
    [weekPoints],
  )

  const milestones = useMemo(() => buildMilestoneViews(days, TRAINING_MILESTONES), [days])
  const hints = useMemo(() => buildAdjustmentHints(bodyRows), [bodyRows])

  const maxKcal = useMemo(() => Math.max(1, ...mealDays.map((d) => d.kcal)), [mealDays])
  const avgKcal = useMemo(() => Math.round(mealDays.reduce((s, d) => s + d.kcal, 0) / Math.max(1, mealDays.length)), [mealDays])

  const showManual = !today || today.source !== "hevy"
  const goalUrl = prefs.goalImageUrl ?? ""
  const remotePrefs = isSupabaseEnabled() && !isAppMockMode()

  const onPickImage = () => fileInputRef.current?.click()

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !file.type.startsWith("image/")) return
    const reader = new FileReader()
    reader.onload = () => {
      const r = reader.result
      if (typeof r === "string") setGoalImageUrl(r)
    }
    reader.readAsDataURL(file)
    e.target.value = ""
  }

  const onAdjustNutritionWithAI = () => {
    window.alert(
      "Ajuste nutricional con IA (placeholder Bloque 3): propondremos kcal y macros según carga en Hevy y medidas corporales.",
    )
  }

  const onGenerateGoalWithAI = () => {
    window.alert(
      "Imagen de referencia con IA (placeholder Bloque 3): aquí enlazaremos generación o edición de imagen objetivo.",
    )
  }

  const chartEmpty = chartRows.every((r) => r.volumen === 0)

  return (
    <div style={{ display: "grid", gap: "var(--spacing-lg)" }}>
      <div>
        <h1 style={{ margin: 0, fontSize: "28px", fontWeight: 500 }}>Operaciones de Entrenamiento</h1>
        <p style={{ margin: "6px 0 0", fontSize: "13px", color: "var(--color-text-secondary)" }}>
          Mantenimiento físico, carga y objetivos de rendimiento
        </p>
        {!remotePrefs && !isAppMockMode() && (
          <p style={{ margin: "8px 0 0", fontSize: "11px", color: "var(--color-text-secondary)" }}>
            Objetivo visual, medidas y plan nutricional se guardan en este navegador. Con{" "}
            <code style={{ fontSize: "10px" }}>NEXT_PUBLIC_SUPABASE_ENABLED=true</code> se sincronizan en tu cuenta.
          </p>
        )}
        {isAppMockMode() && (
          <p style={{ margin: "8px 0 0", fontSize: "11px", color: "var(--color-text-secondary)" }}>
            Modo mock: datos de Hevy simulados; preferencias solo en localStorage.
          </p>
        )}
      </div>

      <Card>
        <div
          style={{
            padding: "var(--spacing-lg)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "var(--spacing-lg)",
          }}
        >
          <div style={{ display: "grid", gap: "var(--spacing-sm)" }}>
            <p
              style={{
                margin: 0,
                fontSize: "11px",
                textTransform: "uppercase",
                letterSpacing: "0.18em",
                color: "var(--color-text-secondary)",
              }}
            >
              Capacidad diaria
            </p>
            <h2 style={{ margin: 0, fontSize: "22px" }}>{formatStatus(today?.status ?? manualStatus ?? "rest")}</h2>
            <p style={{ margin: 0, fontSize: "12px", color: "var(--color-text-secondary)" }}>
              Recuperación estimada ~{recoveryPct}% · Carga (strain) {strain} según volumen Hevy últimos 7 días y hoy.
            </p>
            {showManual && (
              <div style={{ display: "flex", gap: "10px", marginTop: "var(--spacing-sm)" }}>
                {[
                  { label: "Descanso", value: "rest" },
                  { label: "Pausar", value: "skip" },
                  { label: "Natación", value: "swim" },
                ].map((item) => (
                  <button
                    key={item.value}
                    type="button"
                    onClick={() => setManualStatus(item.value as TrainingStatus)}
                    style={{
                      padding: "8px 16px",
                      borderRadius: "10px",
                      border: "0.5px solid var(--color-border)",
                      background: "var(--color-accent-health)",
                      fontSize: "12px",
                      fontWeight: 600,
                      color: "white",
                    }}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            )}
            {(error || loading) && (
              <p style={{ margin: 0, color: "var(--color-text-secondary)", fontSize: "11px" }}>
                {loading ? "Sincronizando con Hevy…" : "Sin conexión con Hevy. Operando en modo manual o con datos locales."}
              </p>
            )}
          </div>
          <div
            style={{
              width: "120px",
              height: "120px",
              borderRadius: "50%",
              border: "6px solid color-mix(in srgb, var(--color-accent-health) 40%, transparent)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              position: "relative",
            }}
          >
            <div
              style={{
                position: "absolute",
                width: "92px",
                height: "92px",
                borderRadius: "50%",
                border: "6px solid color-mix(in srgb, var(--color-accent-warning) 40%, transparent)",
              }}
            />
            <div style={{ textAlign: "center" }}>
              <p style={{ margin: 0, fontSize: "22px", fontWeight: 600 }}>{strain}</p>
              <p
                style={{
                  margin: 0,
                  fontSize: "10px",
                  color: "var(--color-text-secondary)",
                  textTransform: "uppercase",
                  letterSpacing: "0.12em",
                }}
              >
                Strain
              </p>
            </div>
          </div>
        </div>
      </Card>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: "var(--layout-gap)" }}>
        <Card>
          <div style={{ padding: "var(--spacing-md)", display: "grid", gap: "var(--spacing-sm)" }}>
            <p
              style={{
                margin: 0,
                fontSize: "11px",
                textTransform: "uppercase",
                letterSpacing: "0.14em",
                color: "var(--color-text-secondary)",
              }}
            >
              Volumen e intensidad (7 días, Hevy)
            </p>
            <div className="w-full min-w-0 overflow-x-auto overscroll-x-contain">
              <div style={{ height: "200px", width: "100%", minWidth: "280px" }}>
              {chartEmpty ? (
                <div
                  style={{
                    height: "100%",
                    borderRadius: "14px",
                    border: "0.5px solid var(--color-border)",
                    background: "var(--color-surface-alt)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "12px",
                    color: "var(--color-text-secondary)",
                    textAlign: "center",
                    padding: "12px",
                  }}
                >
                  Sin volumen registrado en Hevy en la última semana. Completa entrenos o revisa la integración.
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={chartRows} margin={rechartsDefaultMargin}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" opacity={0.5} />
                    <XAxis dataKey="name" tick={{ fontSize: 10 }} stroke="var(--color-text-secondary)" interval="preserveStartEnd" />
                    <YAxis yAxisId="v" width={36} tick={{ fontSize: 10 }} stroke="var(--color-text-secondary)" />
                    <YAxis yAxisId="i" orientation="right" width={36} tick={{ fontSize: 10 }} stroke="var(--color-text-secondary)" domain={[0, 100]} />
                    <Tooltip contentStyle={rechartsTooltipContentStyle} />
                    <Bar yAxisId="v" dataKey="volumen" name="Volumen (score)" fill="var(--color-accent-health)" radius={[6, 6, 0, 0]} />
                    <Line yAxisId="i" type="monotone" dataKey="intensidad" name="Intensidad relativa" stroke="var(--color-accent-warning)" strokeWidth={2} dot={false} />
                  </ComposedChart>
                </ResponsiveContainer>
              )}
              </div>
            </div>
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: "10px 14px",
                fontSize: "11px",
                color: "var(--color-text-secondary)",
              }}
            >
              <span>● Volumen (score Hevy: series × 10)</span>
              <span>● Intensidad relativa (0–100)</span>
            </div>
          </div>
        </Card>
        <Card>
          <div style={{ padding: "var(--spacing-md)", display: "grid", gap: "var(--spacing-sm)" }}>
            <p
              style={{
                margin: 0,
                fontSize: "11px",
                textTransform: "uppercase",
                letterSpacing: "0.14em",
                color: "var(--color-text-secondary)",
              }}
            >
              Hitos estratégicos
            </p>
            {milestones.map((item) => (
              <div key={item.id} style={{ padding: "12px", borderRadius: "14px", background: "var(--color-surface-alt)" }}>
                <p style={{ margin: 0, fontSize: "13px", fontWeight: 500 }}>{item.title}</p>
                <p style={{ margin: "4px 0 0", fontSize: "11px", color: "var(--color-text-secondary)" }}>{item.progressLabel}</p>
                <p style={{ margin: "4px 0 0", fontSize: "10px", color: "var(--color-text-secondary)" }}>{item.subtitle}</p>
                <div style={{ height: "6px", borderRadius: "999px", background: "var(--color-border)", marginTop: "10px" }}>
                  <div style={{ height: "6px", borderRadius: "999px", width: `${item.barPct}%`, background: "#0F172A" }} />
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <TrainingVisualBodySection
        goalImageUrl={goalUrl}
        placeholderImageSrc="/training/visual-goal-placeholder.png"
        visualGoalDescription={
          prefs.visualGoalDescription ??
          "Cuerpo atlético con 12% grasa, hombros y brazos marcados, postura fuerte y energía sostenida todo el día."
        }
        visualGoalDeadlineYm={prefs.visualGoalDeadlineYm ?? "2026-10"}
        visualGoalPriority={prefs.visualGoalPriority ?? "alta"}
        bodyRows={bodyRows}
        hints={hints}
        prefsLoading={prefsLoading}
        remotePrefs={remotePrefs}
        fileInputRef={fileInputRef}
        onPickImage={onPickImage}
        onFileChange={onFileChange}
        onGenerateGoalWithAI={onGenerateGoalWithAI}
      />

      <Card>
        <div style={{ padding: "var(--spacing-lg)", display: "grid", gap: "var(--spacing-md)" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "12px" }}>
            <div>
              <p
                style={{
                  margin: 0,
                  fontSize: "11px",
                  textTransform: "uppercase",
                  letterSpacing: "0.14em",
                  color: "var(--color-text-secondary)",
                }}
              >
                Plan de alimentación semanal
              </p>
              <p style={{ margin: "6px 0 0", fontSize: "12px", color: "var(--color-text-secondary)" }}>
                Nutrición táctica alineada a recomposición corporal
              </p>
            </div>
            <button
              type="button"
              onClick={onAdjustNutritionWithAI}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "8px",
                padding: "8px 14px",
                borderRadius: "10px",
                border: "0.5px solid var(--color-border)",
                background: "var(--color-accent-health)",
                color: "white",
                fontSize: "12px",
                fontWeight: 600,
                textTransform: "uppercase",
                letterSpacing: "0.12em",
              }}
            >
              Ajustar con IA
            </button>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(7, minmax(0, 1fr))", gap: "var(--spacing-sm)" }}>
            {mealDays.map((day) => (
              <div
                key={day.day}
                style={{
                  padding: "12px",
                  borderRadius: "14px",
                  background: "var(--color-surface-alt)",
                  display: "grid",
                  gap: "8px",
                  border: "0.5px solid var(--color-border)",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <span style={{ fontSize: "12px", fontWeight: 600 }}>{day.day}</span>
                  <span style={{ fontSize: "10px", color: "var(--color-text-secondary)" }}>{day.kcal} KCAL</span>
                </div>
                <div style={{ display: "grid", gap: "4px", fontSize: "11px" }}>
                  <span style={{ color: "var(--color-accent-health)" }}>P {day.pro}g</span>
                  <span style={{ color: "var(--color-accent-warning)" }}>C {day.carb}g</span>
                  <span style={{ color: "var(--color-accent-primary)" }}>G {day.fat}g</span>
                </div>
                <div style={{ height: "6px", borderRadius: "999px", background: "var(--color-border)" }}>
                  <div
                    style={{
                      height: "6px",
                      borderRadius: "999px",
                      width: `${Math.round((day.kcal / maxKcal) * 100)}%`,
                      background: "var(--color-accent-health)",
                    }}
                  />
                </div>
              </div>
            ))}
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
              gap: "var(--spacing-sm)",
              background: "#FFF3ED",
              border: "0.5px solid #FDE5DA",
              borderRadius: "12px",
              padding: "12px",
            }}
          >
            <div>
              <p style={{ margin: 0, fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.12em", color: "var(--color-text-secondary)" }}>
                Resumen semanal
              </p>
              <p style={{ margin: "6px 0 0", fontSize: "12px" }}>
                {avgKcal} kcal promedio · objetivo coherente con plan guardado
              </p>
            </div>
            <div>
              <p style={{ margin: 0, fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.12em", color: "var(--color-text-secondary)" }}>
                Recomendación actual
              </p>
              <p style={{ margin: "6px 0 0", fontSize: "12px" }}>Mantener. Si el peso no baja en varios días, usa &quot;Ajustar con IA&quot; (próximo) o −150 kcal en días suaves.</p>
            </div>
            <div>
              <p style={{ margin: 0, fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.12em", color: "var(--color-text-secondary)" }}>
                Notas
              </p>
              <label style={{ display: "block", marginTop: "6px" }}>
                <span style={{ position: "absolute", width: 1, height: 1, overflow: "hidden", clip: "rect(0 0 0 0)" }}>
                  Notas semanales
                </span>
                <textarea
                  value={prefs.mealNotes ?? ""}
                  onChange={(e) => setMealNotes(e.target.value)}
                  rows={2}
                  placeholder="Cheat meal, eventos, sensaciones…"
                  style={{
                    width: "100%",
                    fontSize: "12px",
                    borderRadius: "8px",
                    border: "0.5px solid var(--color-border)",
                    padding: "8px",
                    resize: "vertical",
                    background: "var(--color-surface)",
                    color: "var(--color-text-primary)",
                  }}
                />
              </label>
            </div>
          </div>
        </div>
      </Card>
    </div>
  )
}
