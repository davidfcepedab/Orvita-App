import { authCardSurfaceClass } from "@/app/auth/_components/authCardClasses"
import { AuthScenicBackdrop } from "@/app/auth/_components/AuthScenicBackdrop"

export default function AuthLoading() {
  return (
    <div className="relative isolate flex min-h-[100dvh] min-h-[-webkit-fill-available] w-full flex-col">
      <AuthScenicBackdrop />
      <div
        className="relative z-10 mx-auto flex w-full max-w-[26rem] flex-1 flex-col justify-center pl-[max(1.25rem,env(safe-area-inset-left,0px))] pr-[max(1.25rem,env(safe-area-inset-right,0px))] pb-[max(2rem,env(safe-area-inset-bottom,0px))] pt-[max(1.25rem,env(safe-area-inset-top,0px))] sm:px-6 sm:pb-12 sm:pt-8"
        aria-busy="true"
        aria-label="Cargando acceso"
      >
      <div
        className={`space-y-6 p-6 motion-safe:animate-pulse sm:p-7 ${authCardSurfaceClass}`}
      >
        <div className="space-y-2">
          <div className="h-3 w-16 rounded bg-[color-mix(in_srgb,var(--color-accent-primary)_12%,#f1f5f9)]" />
          <div className="h-8 w-4/5 max-w-[14rem] rounded-md bg-[color-mix(in_srgb,var(--color-accent-primary)_10%,#f1f5f9)]" />
          <div className="h-4 w-full rounded bg-[color-mix(in_srgb,var(--color-accent-primary)_8%,#f1f5f9)]" />
          <div className="h-4 w-5/6 rounded bg-[color-mix(in_srgb,var(--color-accent-primary)_8%,#f1f5f9)]" />
        </div>
        <div className="h-12 w-full rounded-[var(--radius-button)] bg-[color-mix(in_srgb,var(--color-accent-primary)_9%,#eef2f6)] shadow-inner" />
        <div className="space-y-3">
          <div className="h-11 w-full rounded-[var(--radius-button)] bg-[color-mix(in_srgb,var(--color-accent-primary)_8%,#f1f5f9)]" />
          <div className="h-11 w-full rounded-[var(--radius-button)] bg-[color-mix(in_srgb,var(--color-accent-primary)_8%,#f1f5f9)]" />
          <div className="h-11 w-full rounded-[var(--radius-button)] bg-[color-mix(in_srgb,var(--color-text-primary)_14%,#f1f5f9)]" />
        </div>
      </div>
      <p className="mt-5 text-center text-xs text-orbita-secondary">Cargando pantalla de acceso…</p>
      </div>
    </div>
  )
}
