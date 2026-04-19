"use client"

import type { UiAgendaTask } from "@/app/agenda/mapAgendaTaskToUi"

/** Indicador compacto de flujo / origen (referencia Figma: G.Tasks, Me →, ← Me). */
export function TaskSourceBadge({ type }: { type: UiAgendaTask["type"] }) {
  const cfg =
    type === "personal"
      ? { label: "G.Tasks", bg: "color-mix(in srgb, var(--agenda-assigned) 20%, transparent)", color: "var(--agenda-assigned)" }
      : type === "asignada"
        ? { label: "Me →", bg: "color-mix(in srgb, var(--agenda-assigned) 16%, transparent)", color: "var(--agenda-assigned)" }
        : type === "compartida"
          ? { label: "Hogar", bg: "color-mix(in srgb, var(--agenda-shared) 22%, transparent)", color: "var(--agenda-shared)" }
          : { label: "← Me", bg: "color-mix(in srgb, var(--agenda-received) 20%, transparent)", color: "var(--agenda-received)" }

  return (
    <span
      className="inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.1em]"
      style={{ background: cfg.bg, color: cfg.color }}
    >
      {cfg.label}
    </span>
  )
}
