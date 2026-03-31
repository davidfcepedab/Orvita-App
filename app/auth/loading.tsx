export default function AuthLoading() {
  return (
    <div className="mx-auto flex min-h-[70vh] max-w-lg flex-col justify-center px-6 py-12">
      <div className="space-y-4 rounded-2xl border border-gray-200/90 bg-gray-50/90 p-6 shadow-sm motion-safe:animate-pulse dark:border-gray-800 dark:bg-gray-950/90">
        <div className="h-8 w-3/4 rounded-md bg-gray-200 dark:bg-gray-800" />
        <div className="h-4 w-full rounded-md bg-gray-200 dark:bg-gray-800" />
        <div className="h-10 w-full rounded-lg bg-gray-200 dark:bg-gray-800" />
        <div className="h-10 w-full rounded-lg bg-gray-200 dark:bg-gray-800" />
        <div className="h-10 w-full rounded-lg bg-gray-300 dark:bg-gray-700" />
      </div>
      <p className="mt-4 text-center text-xs text-gray-500">Cargando pantalla de acceso…</p>
    </div>
  )
}
