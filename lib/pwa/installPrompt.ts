/**
 * Almacena el evento `beforeinstallprompt` para poder llamar a `prompt()` desde UI
 * (banner flotante o Configuración → Instalar como app).
 */
type ChromiumInstallPrompt = Event & {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>
}

type InstallPromptSubscriber = () => void

let deferred: ChromiumInstallPrompt | null = null
const subscribers = new Set<InstallPromptSubscriber>()

function notify() {
  subscribers.forEach((cb) => {
    try {
      cb()
    } catch {
      /* ignore */
    }
  })
}

export function subscribeInstallPrompt(cb: InstallPromptSubscriber): () => void {
  subscribers.add(cb)
  return () => subscribers.delete(cb)
}

export function getDeferredInstallPrompt(): ChromiumInstallPrompt | null {
  return deferred
}

export function clearDeferredInstallPrompt() {
  deferred = null
  notify()
}

/** Llamar desde un `useEffect` global al escuchar `beforeinstallprompt`. */
export function captureInstallPromptEvent(e: Event) {
  e.preventDefault()
  deferred = e as ChromiumInstallPrompt
  notify()
}

export async function runDeferredInstallPrompt(): Promise<{ outcome: "accepted" | "dismissed" | "unavailable" }> {
  if (!deferred) return { outcome: "unavailable" }
  try {
    await deferred.prompt()
    const choice = await deferred.userChoice
    deferred = null
    notify()
    return { outcome: choice.outcome === "accepted" ? "accepted" : "dismissed" }
  } catch {
    deferred = null
    notify()
    return { outcome: "unavailable" }
  }
}

export function isStandaloneDisplayMode(): boolean {
  if (typeof window === "undefined") return false
  return window.matchMedia("(display-mode: standalone)").matches || (window.navigator as { standalone?: boolean }).standalone === true
}

/** Heurística móvil para mostrar CTA de instalación antes de las 2 visitas. */
export function isCoarsePointerMobile(): boolean {
  if (typeof window === "undefined") return false
  return window.matchMedia("(pointer: coarse)").matches && window.matchMedia("(max-width: 720px)").matches
}
