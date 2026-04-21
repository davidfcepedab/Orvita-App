/**
 * Registra etiquetas de Background Sync cuando el SW y el permiso lo permiten.
 * Los handlers viven en `public/sw.js` y notifican a las pestañas vía `postMessage`.
 */
export async function registerOrvitaBackgroundSync(reg: ServiceWorkerRegistration | null) {
  if (!reg || !("sync" in reg)) return
  const sync = reg.sync as { register: (tag: string) => Promise<void> }
  try {
    await sync.register("orvita-habits")
  } catch {
    /* navegador sin soporte o permisos */
  }
  try {
    await sync.register("orvita-notifications")
  } catch {
    /* ignore */
  }
}
