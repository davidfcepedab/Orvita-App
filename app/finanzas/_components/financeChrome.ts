import type { CSSProperties } from "react"

/** Estilos compartidos del módulo Capital (finanzas): menos capas y mismo borde/sombra. */
export const financeInsetBarClass =
  "rounded-[var(--radius-card)] border border-[color-mix(in_srgb,var(--color-border)_72%,transparent)] bg-[color-mix(in_srgb,var(--color-surface-alt)_48%,var(--color-surface))] px-3 py-1.5 text-[11px] sm:px-4 sm:py-2 sm:text-xs"

export const financeModuleHeroClass =
  "min-w-0 border-[color-mix(in_srgb,var(--color-border)_70%,transparent)] p-3 shadow-[var(--shadow-card)] sm:p-4"

/** Contenedor principal de cada sub-vista: ritmo compacto tipo app. */
export const financeViewRootClass = "min-w-0 space-y-3 sm:space-y-4"

/**
 * Ritmo vertical del contenido principal (misma escala que la página P&L: CFO + detalle).
 * Combinar con {@link financeModulePageBodyClass} para que el cambio sea visible (no solo margen).
 */
export const financeModuleContentStackClass = "space-y-8 sm:space-y-10 lg:space-y-12"

/**
 * Cuerpo de vista debajo del hero Capital: misma familia visual que la tarjeta «Evolución de flujo» en Resumen
 * (borde, fondo surface-alt, sombra) para separar claramente del lienzo y del rail de pestañas.
 */
export const financeModulePageBodyClass =
  "min-w-0 overflow-x-clip rounded-[22px] border border-[color-mix(in_srgb,var(--color-border)_55%,transparent)] bg-[color-mix(in_srgb,var(--color-surface-alt)_52%,var(--color-surface))] px-3 pb-5 pt-4 shadow-[var(--shadow-card)] sm:rounded-3xl sm:p-7"

/**
 * Rótulos en mayúsculas (hero Capital, secciones CFO/P+L, score): una sola escala tipográfica.
 */
export const financeSectionEyebrowClass =
  "text-[10px] font-semibold uppercase tracking-[0.14em] text-orbita-secondary sm:text-[11px]"

/**
 * Título de bloque en vistas Capital (cuenta atrás del eyebrow; mismo peso que misión cards).
 */
export const financeModuleSectionHeadingClass =
  "text-[15px] font-bold leading-snug tracking-tight text-orbita-primary sm:text-[1.05rem]"

/** Texto introductorio bajo un rótulo de sección (CFO, detalle P+L). */
export const financeSectionIntroClass =
  "mt-1 w-full min-w-0 max-w-full text-pretty text-[11px] leading-relaxed text-orbita-muted [overflow-wrap:anywhere] sm:text-xs"

/** Hint bajo título de tarjeta KPI (sin margen superior propio en el token base). */
export const financeCardHintClass =
  "mt-0.5 w-full min-w-0 max-w-full text-pretty text-[11px] leading-relaxed text-orbita-muted [overflow-wrap:anywhere] sm:text-xs"

/** Rótulos compactos dentro de tarjetas KPI / métricas (una línea). */
export const financeCardMicroLabelClass =
  "text-[10px] font-semibold uppercase tracking-[0.12em] text-orbita-secondary"

/** Franja puente entre métricas (p. ej. variación mes a mes). */
export const financeBridgeMicroLabelClass =
  "text-[10px] font-medium uppercase tracking-[0.1em] text-orbita-muted"

/** Base compartida para chips del hero CFO (nivel, focos). */
export const financeHeroChipBaseClass =
  "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold leading-tight"

/** Aviso tipo banner compacto (demo, sync, RLS) — mismo tono que píldoras ámbar del módulo. */
export const financeNoticeChipClass =
  "inline-flex items-center rounded-full border border-amber-500/35 bg-amber-500/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-amber-950 dark:border-amber-500/30 dark:bg-amber-500/15 dark:text-amber-50"

/** Chip neutro (estado, meta, demo sin alerta). */
export const financeNeutralChipClass =
  "inline-flex items-center rounded-full border border-orbita-border/70 bg-orbita-surface-alt/80 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-orbita-secondary"

/**
 * Carril segmentado in-page (3–4 modos): mismo gesto visual que las pestañas del hero Capital.
 */
export const financeInlineSegmentRailClass =
  "flex w-full min-w-0 max-w-full flex-wrap gap-0.5 rounded-2xl border border-[color-mix(in_srgb,var(--color-border)_65%,transparent)] bg-[color-mix(in_srgb,var(--color-surface-alt)_45%,var(--color-surface))] p-0.5"

/**
 * Resumen de `<details>` auxiliar (detalle técnico, ledger, tablas plegables): alineado con P&L «Añadir ajuste» / bloques plegables.
 */
export const financeAuxDisclosureSummaryClass =
  "flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 text-[11px] font-semibold text-orbita-primary sm:px-5 [&::-webkit-details-marker]:hidden"

export const financeAuxDisclosureBodyClass = "border-t border-orbita-border/40 bg-orbita-surface-alt/15"

/** Panel elevado dentro de una vista (bloques de métricas, simuladores): borde suave + surface-alt. */
export const financeRaisedPanelClass =
  "rounded-[var(--radius-card)] border border-[color-mix(in_srgb,var(--color-border)_55%,transparent)] bg-[color-mix(in_srgb,var(--color-surface-alt)_40%,var(--color-surface))] shadow-[var(--shadow-card)]"

/** Tarjeta KPI secundaria (grid Salud/Perspectivas): misma piel que tarjetas CFO «Estado del periodo». */
export const financeKpiCardClass =
  "border-orbita-border/75 bg-[color-mix(in_srgb,var(--color-surface-alt)_38%,var(--color-surface))]"

/** Tagline bajo el título del hero Capital (no muted). */
export const financeModuleHeroTaglineClass =
  "m-0 w-full min-w-0 max-w-full text-pretty text-[11px] leading-relaxed text-orbita-secondary/95 [overflow-wrap:anywhere] sm:text-xs"

/**
 * Vista P&L: el shell ya limita a `max-w-[1400px]` en desktop.
 * En móvil (p. ej. iPhone 16 Pro Max ≈ 430×CSS px) usar breakpoints `min-[400px]:` / `sm:` para
 * no depender solo de `sm` (640px): así el layout “grande” del teléfono aprovecha mejor el ancho.
 */
export const financePlStackClass = "w-full min-w-0 max-w-full"

/** Barra de tabs del layout: aspecto “segmented control” iOS / app. */
export const financeModuleSubnavClass =
  "flex w-full min-w-0 max-w-full touch-pan-x snap-x snap-mandatory gap-0.5 overflow-x-auto overflow-y-hidden overscroll-x-contain rounded-2xl border border-[color-mix(in_srgb,var(--color-border)_68%,transparent)] p-0.5 [-webkit-overflow-scrolling:touch] backdrop-blur-[6px] sm:flex-wrap sm:overflow-x-visible sm:snap-none"

export const financeModuleSubnavStyle: CSSProperties = {
  background: "color-mix(in srgb, var(--color-surface-alt) 52%, var(--color-background))",
  boxShadow: "inset 0 1px 0 color-mix(in srgb, #fff 35%, transparent)",
}

/** Pestañas: rail compacto con tinte financiero muy suave; sm+ = rejilla 7×1. */
export const financeModuleSubnavEmbeddedClass =
  "flex w-full min-w-0 max-w-full touch-pan-x snap-x snap-mandatory gap-0.5 overflow-x-auto overflow-y-hidden overscroll-x-contain border-t border-[color-mix(in_srgb,var(--color-border)_36%,transparent)] bg-[color-mix(in_srgb,var(--color-accent-finance)_8%,color-mix(in_srgb,var(--color-surface-alt)_30%,var(--color-surface)))] px-1 py-1 [-webkit-overflow-scrolling:touch] sm:grid sm:grid-cols-7 sm:gap-0.5 sm:overflow-x-visible sm:snap-none sm:px-1.5 sm:py-1"

export const financeModuleSubnavEmbeddedStyle: CSSProperties = {
  background: "transparent",
  boxShadow: "none",
}

type SubnavTabOpts = {
  /** Rail integrado en el hero: menos contraste y sin anillo fuerte. */
  subtle?: boolean
}

export function financeSubnavTabClass(active: boolean, opts?: SubnavTabOpts): string {
  const subtle = opts?.subtle === true
  if (subtle) {
    return [
      "inline-flex min-h-[30px] min-w-0 w-full max-sm:h-[30px] max-sm:w-[6rem] max-sm:min-w-[6rem] max-sm:max-w-[6rem] max-sm:flex-none max-sm:shrink-0 snap-start flex-row items-center justify-center gap-1 rounded-lg px-1 py-0.5 text-center text-[9px] font-medium uppercase leading-none tracking-[0.05em] transition-[background-color,color,box-shadow,ring-color] duration-200 sm:min-h-[32px] sm:gap-1 sm:rounded-[9px] sm:px-1 sm:py-1 sm:text-[10px] sm:tracking-[0.06em]",
      active
        ? "bg-[color-mix(in_srgb,var(--color-accent-finance)_13%,var(--color-surface))] text-orbita-primary shadow-[0_1px_2px_rgba(15,23,42,0.06)] ring-1 ring-[color-mix(in_srgb,var(--color-accent-finance)_42%,var(--color-border))]"
        : "bg-[color-mix(in_srgb,var(--color-surface-alt)_20%,var(--color-surface))] text-orbita-secondary/90 ring-1 ring-[color-mix(in_srgb,var(--color-border)_22%,transparent)] hover:bg-[color-mix(in_srgb,var(--color-accent-finance)_10%,var(--color-surface))] hover:text-orbita-primary hover:ring-[color-mix(in_srgb,var(--color-border)_36%,transparent)]",
    ].join(" ")
  }
  return [
    "min-h-[40px] flex-shrink-0 snap-start rounded-[11px] px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.12em] transition-[transform,box-shadow,background-color,color] duration-200 sm:min-h-0 sm:px-3.5 sm:py-2 sm:text-[12px] sm:tracking-[0.13em]",
    active
      ? "scale-[1.01] bg-orbita-surface text-orbita-primary shadow-[var(--shadow-card)] ring-2 ring-[color-mix(in_srgb,var(--color-accent-finance)_42%,transparent)] motion-reduce:scale-100"
      : "text-orbita-secondary hover:bg-orbita-surface/55 hover:text-orbita-primary active:scale-[0.99]",
  ].join(" ")
}
