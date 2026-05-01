import { clsx } from "clsx"

/** Lucide Heart / pulso — acento salud (sin opacidad). */
export const healthCtaHeartIconClass =
  "h-3.5 w-3.5 shrink-0 text-[var(--color-accent-health)]"

/** Lucide Dumbbell — “heavy”: texto principal (oscuro). */
export const healthCtaDumbbellIconClass = "h-3.5 w-3.5 shrink-0 text-[var(--color-text-primary)]"

/** «Ver Salud» — mismo aspecto en Inicio/Hoy y bloques de salud (no nav). */
export const verSaludLinkClass = clsx(
  "inline-flex w-full flex-1 items-center justify-center gap-1.5 text-center no-underline motion-safe:transition-opacity",
  "max-sm:min-h-0 max-sm:flex-1 max-sm:border-0 max-sm:bg-transparent max-sm:py-1.5 max-sm:text-[11px] max-sm:font-medium max-sm:text-[var(--color-accent-health)] max-sm:underline max-sm:underline-offset-4 max-sm:decoration-[color-mix(in_srgb,var(--color-accent-health)_40%,transparent)] max-sm:hover:opacity-85",
  "sm:min-h-0 sm:flex-1 sm:rounded-xl sm:border sm:border-[color-mix(in_srgb,var(--color-accent-health)_38%,var(--color-border))] sm:bg-[color-mix(in_srgb,var(--color-accent-health)_12%,var(--color-surface))] sm:px-4 sm:py-3 sm:text-xs sm:font-semibold sm:text-[var(--color-text-primary)] sm:hover:opacity-90",
)

/** «Entrenamiento» — borde/texto primary (peso), icono dumbbell en healthCtaDumbbellIconClass. */
export const entrenamientoLinkClass = clsx(
  "inline-flex w-full flex-1 items-center justify-center gap-1.5 text-center no-underline motion-safe:transition-colors",
  "max-sm:min-h-0 max-sm:flex-1 max-sm:border-0 max-sm:bg-transparent max-sm:py-1.5 max-sm:text-[11px] max-sm:font-medium max-sm:text-[var(--color-text-secondary)] max-sm:underline max-sm:underline-offset-4 max-sm:hover:text-[var(--color-text-primary)]",
  "sm:min-h-0 sm:flex-1 sm:rounded-xl sm:border sm:border-[color-mix(in_srgb,var(--color-text-primary)_24%,var(--color-border))] sm:bg-[var(--color-surface-alt)] sm:px-3 sm:py-3 sm:text-[11px] sm:font-semibold sm:text-[var(--color-text-primary)] sm:no-underline sm:hover:bg-[color-mix(in_srgb,var(--color-text-primary)_07%,var(--color-surface-alt))]",
)

/** CTA compacto (tarjetas decisión / puente) — misma cromática que entrenamientoLinkClass desktop. */
export const entrenamientoCtaCompactClass = clsx(
  "inline-flex shrink-0 items-center justify-center gap-1.5 rounded-xl border px-3 py-2 text-[11px] font-semibold no-underline transition-colors",
  "border-[color-mix(in_srgb,var(--color-text-primary)_24%,var(--color-border))] bg-[var(--color-surface-alt)] text-[var(--color-text-primary)]",
  "hover:bg-[color-mix(in_srgb,var(--color-text-primary)_07%,var(--color-surface-alt))] active:opacity-95",
)
