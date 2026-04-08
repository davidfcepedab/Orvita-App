export default function AuthLoading() {
  return (
    <div className="mx-auto flex min-h-[70vh] max-w-lg flex-col justify-center px-6 py-12">
      <div className="space-y-4 rounded-2xl border border-orbita-border bg-orbita-surface p-6 shadow-card motion-safe:animate-pulse">
        <div className="h-8 w-3/4 rounded-md bg-orbita-surface-alt" />
        <div className="h-4 w-full rounded-md bg-orbita-surface-alt" />
        <div className="h-10 w-full rounded-lg bg-orbita-surface-alt" />
        <div className="h-10 w-full rounded-lg bg-orbita-surface-alt" />
        <div className="h-10 w-full rounded-lg bg-orbita-border" />
      </div>
      <p className="mt-4 text-center text-xs text-orbita-secondary">Cargando pantalla de acceso…</p>
    </div>
  )
}
