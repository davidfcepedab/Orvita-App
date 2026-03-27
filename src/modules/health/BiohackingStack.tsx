"use client"

import { useState } from "react"
import { designTokens } from "@/src/theme/design-tokens"

type StackItem = {
  name: string
  time: string
  completed: boolean
}

export function BiohackingStack() {
  const [items] = useState<StackItem[]>([
    { name: "Magnesio", time: "21:00", completed: false },
    { name: "Omega 3", time: "08:00", completed: true },
  ])

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--spacing-sm)" }}>
      {items.map((item) => (
        <div
          key={`${item.name}-${item.time}`}
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "var(--spacing-sm)",
            borderRadius: designTokens.radius.md,
            transition: `transform ${designTokens.animation.duration.normal} ${designTokens.animation.easing.default}`,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "var(--spacing-sm)" }}>
            <span
              style={{
                width: "8px",
                height: "8px",
                borderRadius: designTokens.radius.full,
                background: item.completed ? "var(--color-accent-health)" : "var(--color-border)",
                transform: "scale(0.95)",
                transition: `transform ${designTokens.animation.duration.normal} ${designTokens.animation.easing.default}`,
              }}
            />
            <div>
              <p style={{ margin: 0, fontWeight: 500 }}>{item.name}</p>
              <p style={{ margin: 0, color: "var(--color-text-secondary)", fontSize: designTokens.typography.scale.caption["font-size"] }}>
                {item.time}
              </p>
            </div>
          </div>
          <span
            style={{
              color: item.completed ? "var(--color-accent-health)" : "var(--color-text-secondary)",
              fontSize: designTokens.typography.scale.caption["font-size"],
            }}
          >
            {item.completed ? "Completado" : "Pendiente"}
          </span>
        </div>
      ))}
    </div>
  )
}
