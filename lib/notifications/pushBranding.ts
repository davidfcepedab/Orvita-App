/**
 * Rutas públicas (mismo origen) para Web Push / `showNotification`.
 * Icono 192px: Safari/macOS suelen ignorar o sustituir PNGs enormes (~1MP) o rutas mal resueltas.
 * Mantener alineado con `public/sw.js` (fallback + URLs absolutas allí).
 */
export const ORVITA_PUSH_ICON = "/brand/orvita-push-icon-192.png"
