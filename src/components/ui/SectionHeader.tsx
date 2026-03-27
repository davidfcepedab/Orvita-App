"use client"

import { designTokens } from "@/src/theme/design-tokens"

type SectionHeaderProps = {
  title: string
  description?: string
  gradient?: boolean
}

export function SectionHeader({ title, description, gradient }: SectionHeaderProps) {
  return (
    <div
      style={{
        padding: "var(--spacing-lg)",
        borderRadius: "var(--radius-card)",
        background: gradient
          ? "linear-gradient(135deg, color-mix(in srgb, var(--section-gradient-start, var(--color-accent-health)) 15%, transparent), color-mix(in srgb, var(--section-gradient-end, var(--color-accent-agenda)) 15%, transparent))"
          : "var(--color-surface)",
        border: "0.5px solid var(--color-border)",
      }}
    >
      <p
        style={{
          margin: 0,
          fontSize: designTokens.typography.scale.caption["font-size"],
          letterSpacing: designTokens.typography.scale.caption["letter-spacing"],
          textTransform: "uppercase",
          color: "var(--color-text-secondary)",
        }}
      >
        Section
      </p>
      <h2
        style={{
          margin: "8px 0 4px",
          fontSize: designTokens.typography.scale.h3["font-size"],
          fontWeight: designTokens.typography.scale.h3["font-weight"],
        }}
      >
        {title}
      </h2>
      {description && (
        <p
          style={{
            margin: 0,
            fontSize: designTokens.typography.scale["body-sm"]["font-size"],
            color: "var(--color-text-secondary)",
          }}
        >
          {description}
        </p>
      )}
    </div>
  )
}
