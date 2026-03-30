"use client"

import type { ReactNode } from "react"

export function AgendaStackSection({
  sectionId,
  title,
  subtitle,
  accentVar,
  children,
}: {
  sectionId: string
  title: string
  subtitle?: string
  accentVar: string
  children: ReactNode
}) {
  return (
    <section
      aria-labelledby={sectionId}
      style={{
        display: "grid",
        gap: "var(--spacing-md)",
        scrollMarginTop: "96px",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          gap: "var(--spacing-md)",
          paddingBottom: "var(--spacing-sm)",
          borderBottom: "0.5px solid var(--color-border)",
        }}
      >
        <span
          aria-hidden
          style={{
            width: "4px",
            alignSelf: "stretch",
            minHeight: "40px",
            borderRadius: "4px",
            background: accentVar,
            flexShrink: 0,
          }}
        />
        <div style={{ flex: 1, minWidth: 0 }}>
          <h2
            id={sectionId}
            style={{
              margin: 0,
              fontSize: "17px",
              fontWeight: 600,
              letterSpacing: "-0.02em",
              color: "var(--color-text-primary)",
            }}
          >
            {title}
          </h2>
          {subtitle ? (
            <p
              style={{
                margin: "6px 0 0",
                fontSize: "12px",
                color: "var(--color-text-secondary)",
                lineHeight: 1.45,
              }}
            >
              {subtitle}
            </p>
          ) : null}
        </div>
      </div>
      {children}
    </section>
  )
}
