"use client"

import { useId, useState, type CSSProperties, type KeyboardEvent, type ReactNode } from "react"
import { ChevronDown } from "lucide-react"
import type { OrbitaConfigTheme } from "@/app/components/orbita-v3/config/configThemeTypes"

export type ConfigAccordionCardVariant = "default" | "alt"

type Props = {
  id?: string
  "data-orvita-subsection"?: string
  "data-orvita-section"?: string
  theme: OrbitaConfigTheme
  cardVariant?: ConfigAccordionCardVariant
  status?: "default" | "alert" | "error"
  defaultOpen?: boolean
  className?: string
  /** Contenedor interior del summary (p. ej. alinear a la perfección con icono) */
  summaryClassName?: string
  /** Icono a la izquierda (sólo `card` lo espacia automáticamente). */
  leading?: ReactNode
  /** Permite color sutil por sección para el contenedor del icono. */
  leadingContainerStyle?: CSSProperties
  title: string
  description?: ReactNode
  trailing?: ReactNode
  children: ReactNode
  bodyClassName?: string
  /** Sombra ligeramente más marcada cuando está abierto (sólo `card`). */
  liftWhenOpen?: boolean
}

const cardShadow: Record<ConfigAccordionCardVariant, string> = {
  default: "0 1px 0 rgba(15, 23, 42, 0.04), 0 0 0 1px rgba(15, 23, 42, 0.04)",
  alt: "0 1px 0 rgba(15, 23, 42, 0.05), 0 0 0 1px rgba(15, 23, 42, 0.06)",
}

export const configAccordionTokens = {
  radiusClass: "rounded-2xl",
  summaryPaddingClass: "px-3 py-3 sm:px-4 sm:py-3.5",
  bodyPaddingClass: "px-3 py-3 sm:px-4 sm:py-3.5",
  contentGapClass: "space-y-3",
} as const

export function ConfigAccordion({
  id,
  "data-orvita-subsection": dataSubsection,
  "data-orvita-section": dataSection,
  theme,
  cardVariant = "default",
  status = "default",
  defaultOpen = false,
  className = "",
  summaryClassName = "",
  leading,
  leadingContainerStyle,
  title,
  description,
  trailing,
  children,
  bodyClassName = "",
  liftWhenOpen = true,
}: Props) {
  const bodyId = useId()
  const [isExpanded, setIsExpanded] = useState(defaultOpen)
  const openClass = liftWhenOpen ? "shadow-sm" : ""

  let borderColor = theme.border
  if (status === "alert") borderColor = "rgba(245, 158, 11, 0.34)"
  if (status === "error") borderColor = "rgba(239, 68, 68, 0.34)"

  const onHeaderKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== "Enter" && event.key !== " ") return
    event.preventDefault()
    setIsExpanded((prev) => !prev)
  }

  return (
    <section
      id={id}
      className={`group overflow-hidden ${configAccordionTokens.radiusClass} ${isExpanded ? openClass : ""} ${className}`.trim()}
      data-orvita-subsection={dataSubsection}
      data-orvita-section={dataSection}
      style={{
        backgroundColor: theme.surface,
        boxShadow: cardShadow[cardVariant],
        border: `1px solid ${borderColor}`,
      }}
    >
      <div
        className={`flex cursor-pointer items-center justify-between gap-3 ${configAccordionTokens.summaryPaddingClass} ${summaryClassName}`.trim()}
        style={{ color: theme.text }}
        aria-expanded={isExpanded}
        aria-controls={bodyId}
        role="button"
        tabIndex={0}
        onKeyDown={onHeaderKeyDown}
        onClick={() => setIsExpanded((prev) => !prev)}
      >
        <div className="flex min-w-0 flex-1 items-start gap-2.5 sm:gap-3">
          {leading != null && (
            <span
              className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg"
              style={{ backgroundColor: theme.surfaceAlt, ...leadingContainerStyle }}
              aria-hidden
            >
              {leading}
            </span>
          )}
          <div className="min-w-0 text-left">
            <p className="m-0 text-sm font-medium tracking-tight" style={{ color: theme.text }}>
              {title}
            </p>
            {description != null && description !== "" ? (
              <p
                className="m-0 mt-0.5 text-[12px] leading-snug sm:line-clamp-2"
                style={{ color: theme.textMuted }}
              >
                {description}
              </p>
            ) : null}
          </div>
        </div>
        <div className="flex min-w-0 shrink-0 items-center gap-2">
          {trailing}
          <ChevronDown
            className="h-3.5 w-3.5 shrink-0 transition-transform duration-200 group-open:rotate-180 sm:h-4 sm:w-4"
            style={{ color: theme.textMuted }}
            aria-hidden
          />
        </div>
      </div>
      <div
        id={bodyId}
        role="region"
        className={`grid transition-[grid-template-rows,opacity] duration-200 ease-out ${isExpanded ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"}`}
        aria-label={title}
      >
        <div className="min-h-0 overflow-hidden">
          <div
            className={`border-t ${configAccordionTokens.bodyPaddingClass} ${bodyClassName}`.trim()}
            style={{ borderColor: theme.border }}
          >
            {children}
          </div>
        </div>
      </div>
    </section>
  )
}
