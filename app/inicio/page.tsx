import dynamic from "next/dynamic"

/**
 * Vista “día / ritmo”: HomeV3, Hoy, agenda y hábitos.
 * Ruta canónica acordada: `/inicio` (no usar `/operacional` en enlaces nuevos).
 *
 * Carga diferida de módulos pesados para mejorar TTI en PWA / móvil.
 */
const HomeV3 = dynamic(() => import("@/app/components/orbita-v3/home/HomeV3"), {
  loading: () => <div className="mx-auto max-w-6xl px-4 py-8 text-sm text-[var(--color-text-secondary)]">Cargando inicio…</div>,
})
const HoyV3 = dynamic(() => import("@/app/components/orbita-v3/home/HoyV3"), {
  loading: () => <div className="h-24 animate-pulse rounded-2xl bg-[color-mix(in_srgb,var(--color-surface-alt)_88%,transparent)]" />,
})
const AgendaV3 = dynamic(() => import("@/app/components/orbita-v3/agenda/AgendaV3"), {
  loading: () => <div className="h-32 animate-pulse rounded-2xl bg-[color-mix(in_srgb,var(--color-surface-alt)_88%,transparent)]" />,
})
const HabitosV3 = dynamic(() => import("@/app/components/orbita-v3/habitos/HabitosV3"), {
  loading: () => <div className="h-28 animate-pulse rounded-2xl bg-[color-mix(in_srgb,var(--color-surface-alt)_88%,transparent)]" />,
})

export default function InicioPage() {
  return (
    <div className="mx-auto min-w-0 max-w-6xl space-y-10 overflow-x-hidden px-4 pb-24 pt-4 phone:space-y-12">
      <HomeV3 />
      <HoyV3 />
      <AgendaV3 />
      <HabitosV3 />
    </div>
  )
}
