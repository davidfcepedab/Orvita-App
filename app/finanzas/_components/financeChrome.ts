import type { CSSProperties } from "react"

/** Estilos compartidos del módulo Capital (finanzas): menos capas y mismo borde/sombra. */
export const financeInsetBarClass =
  "rounded-[var(--radius-card)] border border-[color-mix(in_srgb,var(--color-border)_72%,transparent)] bg-[color-mix(in_srgb,var(--color-surface-alt)_48%,var(--color-surface))] px-3 py-1.5 text-[11px] sm:px-4 sm:py-2 sm:text-xs"

export const financeModuleHeroClass =
  "min-w-0 border-[color-mix(in_srgb,var(--color-border)_70%,transparent)] p-2.5 shadow-[var(--shadow-card)] sm:p-4"

/** Contenedor principal de cada sub-vista: ritmo compacto tipo app. */
export const financeViewRootClass = "min-w-0 space-y-3 sm:space-y-4"

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

export function financeSubnavTabClass(active: boolean): string {
  return [
    "min-h-[40px] flex-shrink-0 snap-start rounded-[11px] px-2.5 py-1.5 text-[10px] font-semibold uppercase tracking-[0.1em] transition-[transform,box-shadow,background-color,color] duration-200 sm:min-h-0 sm:px-3.5 sm:py-2 sm:text-[12px] sm:tracking-[0.13em]",
    active
      ? "scale-[1.01] bg-orbita-surface text-orbita-primary shadow-[var(--shadow-card)] ring-2 ring-[color-mix(in_srgb,var(--color-accent-finance)_42%,transparent)] motion-reduce:scale-100"
      : "text-orbita-secondary hover:bg-orbita-surface/55 hover:text-orbita-primary active:scale-[0.99]",
  ].join(" ")
}
