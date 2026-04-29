/** @type {import('next').NextConfig} */

const isDev = process.env.NODE_ENV !== "production"

/**
 * CSP estricta en producción; en desarrollo mantenemos `unsafe-eval` para hot reload de Next.
 * Ajusta `connect-src` si añades dominios de analytics u otros orígenes.
 */
const cspProduction = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' https://mcp.figma.com",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data:",
  "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://vitals.vercel-insights.com https://api.openai.com",
  "worker-src 'self' blob:",
  "manifest-src 'self'",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
].join("; ")

const cspDev = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://mcp.figma.com",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data:",
  "connect-src 'self' https://*.supabase.co wss://*.supabase.co ws://localhost:* http://localhost:*",
  "worker-src 'self' blob:",
  "manifest-src 'self'",
].join("; ")

const nextConfig = {
  reactStrictMode: true,
  images: {
    formats: ["image/avif", "image/webp"],
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-DNS-Prefetch-Control", value: "on" },
          { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
          {
            key: "Content-Security-Policy",
            value: isDev ? cspDev : cspProduction,
          },
        ],
      },
      {
        source: "/shortcuts/Orvita-Importar-Salud-Hoy.shortcut",
        headers: [
          {
            key: "Content-Type",
            value: "application/octet-stream",
          },
          {
            key: "Content-Disposition",
            value: 'attachment; filename="Orvita-Importar-Salud-Hoy.shortcut"',
          },
          { key: "X-Content-Type-Options", value: "nosniff" },
        ],
      },
      {
        source: "/shortcuts/Orvita-Salud-Historial-15Dias.shortcut",
        headers: [
          {
            key: "Content-Type",
            value: "application/octet-stream",
          },
          {
            key: "Content-Disposition",
            value: 'attachment; filename="Orvita-Salud-Historial-15Dias.shortcut"',
          },
          { key: "X-Content-Type-Options", value: "nosniff" },
        ],
      },
    ]
  },
}

/**
 * Integración opcional Serwist (mejor compatibilidad con Turbopack / workbox updates).
 * Activar con: ORVITA_USE_SERWIST=1
 */
if (process.env.ORVITA_USE_SERWIST === "1") {
  // eslint-disable-next-line global-require, @typescript-eslint/no-var-requires
  const withSerwistInit = require("@serwist/next").default
  const withSerwist = withSerwistInit({
    swSrc: "public/sw.js",
    swDest: "public/sw.js",
    disable: false,
  })
  module.exports = withSerwist(nextConfig)
} else {
  module.exports = nextConfig
}
