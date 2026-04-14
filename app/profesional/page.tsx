"use client"

import Link from "next/link"
import { AppShell } from "@/src/components/layout/AppShell"
import { Card } from "@/src/components/ui/Card"
import { SectionHeader } from "@/src/components/ui/SectionHeader"
import { useOperationalContext } from "@/app/hooks/useOperationalContext"
import { useApp } from "@/app/contexts/AppContext"
import { designTokens } from "@/src/theme/design-tokens"

export default function Profesional() {
  const { data, loading, error } = useOperationalContext()
  const { layoutMode } = useApp()

  if (loading) {
    return <div style={{ padding: "var(--spacing-lg)", textAlign: "center", color: "var(--color-text-secondary)" }}>Cargando coach...</div>
  }

  if (error) {
    return <div style={{ padding: "var(--spacing-lg)", textAlign: "center", color: "var(--color-accent-danger)" }}>Error: {error}</div>
  }

  return (
    <AppShell moduleLabel="Coach Module" moduleTitle="Profesional" metaInfo={`Layout: ${layoutMode}`}>
      <SectionHeader
        title="Profesional"
        description="Disciplina, ejecución y consistencia operativa."
        gradient
      />

      <div style={{ display: "grid", gridTemplateColumns: "repeat(12, minmax(0, 1fr))", gap: "var(--layout-gap)" }}>
        <div style={{ gridColumn: "span 6" }}>
          <Card hover>
            <div style={{ padding: "var(--spacing-lg)", display: "grid", gap: "var(--spacing-sm)" }}>
              <p
                style={{
                  margin: 0,
                  fontSize: designTokens.typography.scale.caption["font-size"],
                  letterSpacing: designTokens.typography.scale.caption["letter-spacing"],
                  textTransform: "uppercase",
                  color: "var(--color-text-secondary)",
                }}
              >
                Disciplina
              </p>
              <p style={{ margin: 0, fontSize: "40px", fontWeight: 500 }}>{data?.score_profesional ?? 0}</p>
            </div>
          </Card>
        </div>
        <div style={{ gridColumn: "span 6" }}>
          <Card hover>
            <div style={{ padding: "var(--spacing-lg)", display: "grid", gap: "var(--spacing-sm)" }}>
              <p
                style={{
                  margin: 0,
                  fontSize: designTokens.typography.scale.caption["font-size"],
                  letterSpacing: designTokens.typography.scale.caption["letter-spacing"],
                  textTransform: "uppercase",
                  color: "var(--color-text-secondary)",
                }}
              >
                Score Profesional
              </p>
              <p style={{ margin: 0, fontSize: "40px", fontWeight: 500 }}>{data?.score_profesional ?? 0}</p>
            </div>
          </Card>
        </div>
      </div>

      <Card hover>
        <div style={{ padding: "var(--spacing-lg)", display: "grid", gap: "var(--spacing-sm)" }}>
          <p style={{ margin: 0, color: "var(--color-text-secondary)" }}>Tendencia</p>
          <p style={{ margin: 0, fontSize: "24px", fontWeight: 500 }}>
            {typeof data?.delta_disciplina === "number"
              ? `${data.delta_disciplina > 0 ? "+" : ""}${data.delta_disciplina}%`
              : "Sin datos"}
          </p>
          <p style={{ margin: 0, color: "var(--color-text-secondary)" }}>
            Usa finanzas y salud para balancear ejecución semanal.
          </p>
          <Link href="/agenda" style={{ fontSize: "14px", fontWeight: 500, color: "var(--color-accent-primary)" }}>
            Ir a agenda
          </Link>
        </div>
      </Card>
    </AppShell>
  )
}
