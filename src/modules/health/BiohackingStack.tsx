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
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--spacing-md)" }}>
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
                width: "10px",
                height: "10px",
                borderRadius: designTokens.radius.full,
                background: item.completed ? "var(--color-accent-health)" : "var(--color-border)",
                transform: "scale(0.95)",
                transition: `transform ${designTokens.animation.duration.normal} ${designTokens.animation.easing.default}`,
              }}
            />
            <div>
              <p style={{ margin: 0, fontWeight: 500, fontSize: "16px" }}>{item.name}</p>
              <p
                style={{
                  margin: 0,
                  color: "var(--color-text-secondary)",
                  fontSize: "12px",
                  opacity: 0.6,
                }}
              >
                {item.time}
              </p>
            </div>
          </div>
          <span
            style={{
              color: item.completed ? "var(--color-accent-health)" : "var(--color-text-secondary)",
              fontSize: "12px",
              fontWeight: 500,
              padding: "4px 10px",
              borderRadius: "999px",
              background: item.completed
                ? "color-mix(in srgb, var(--color-accent-health) 10%, transparent)"
                : "color-mix(in srgb, var(--color-text-secondary) 10%, transparent)",
            }}
          >
            {item.completed ? "Completado" : "Pendiente"}
          </span>
        </div>
      ))}
    </div>
  )
}
