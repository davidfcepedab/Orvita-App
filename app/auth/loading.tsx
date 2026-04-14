export default function AuthLoading() {
  return (
    <div
      className="mx-auto flex min-h-[100dvh] min-h-[-webkit-fill-available] w-full max-w-[26rem] flex-col justify-center pl-[max(1.25rem,env(safe-area-inset-left,0px))] pr-[max(1.25rem,env(safe-area-inset-right,0px))] pb-[max(2rem,env(safe-area-inset-bottom,0px))] pt-[max(1.25rem,env(safe-area-inset-top,0px))] sm:px-6 sm:pb-12 sm:pt-8"
      aria-busy="true"
      aria-label="Cargando acceso"
    >
      <div className="space-y-6 rounded-[var(--radius-card)] border border-orbita-border/80 bg-orbita-surface/95 p-6 shadow-card ring-1 ring-orbita-border/25 backdrop-blur-[2px] motion-safe:animate-pulse sm:p-7">
        <div className="space-y-2">
          <div className="h-3 w-16 rounded bg-orbita-surface-alt" />
          <div className="h-8 w-4/5 max-w-[14rem] rounded-md bg-orbita-surface-alt" />
          <div className="h-4 w-full rounded bg-orbita-surface-alt" />
          <div className="h-4 w-5/6 rounded bg-orbita-surface-alt" />
        </div>
        <div className="h-12 w-full rounded-[var(--radius-button)] bg-orbita-surface-alt shadow-inner" />
        <div className="space-y-3">
          <div className="h-11 w-full rounded-[var(--radius-button)] bg-orbita-surface-alt" />
          <div className="h-11 w-full rounded-[var(--radius-button)] bg-orbita-surface-alt" />
          <div className="h-11 w-full rounded-[var(--radius-button)] bg-[color-mix(in_srgb,var(--color-text-primary)_18%,var(--color-surface-alt))]" />
        </div>
      </div>
      <p className="mt-5 text-center text-xs text-orbita-secondary">Cargando pantalla de acceso…</p>
    </div>
  )
}
