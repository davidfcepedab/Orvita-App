"use client"

import { designTokens } from "@/src/theme/design-tokens"

type AppShellProps = {
  sidebar?: React.ReactNode
  header?: React.ReactNode
  children: React.ReactNode
}

export function AppShell({ sidebar, header, children }: AppShellProps) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: `${designTokens.layout["sidebar-width"]} 1fr`,
        gap: "var(--layout-gap)",
        minHeight: "100vh",
      }}
    >
      <aside
        style={{
          borderRight: `${designTokens.border.width.default} ${designTokens.border.style} var(--color-border)`,
          background: "var(--color-surface)",
          boxShadow: designTokens.elevation["arctic-soft"],
        }}
      >
        <div style={{ padding: "var(--layout-padding)" }}>{sidebar}</div>
      </aside>

      <div style={{ display: "flex", flexDirection: "column", minWidth: 0 }}>
        <header
          style={{
            height: designTokens.layout["header-height"],
            display: "flex",
            alignItems: "center",
            borderBottom: `${designTokens.border.width.default} ${designTokens.border.style} var(--color-border)`,
            background: "var(--color-surface)",
            boxShadow: designTokens.elevation["arctic-soft"],
            padding: "0 var(--layout-padding)",
          }}
        >
          {header}
        </header>
        <main style={{ padding: "var(--layout-padding)", flex: 1 }}>{children}</main>
      </div>
    </div>
  )
}
