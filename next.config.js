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
    ]
  },
}

module.exports = nextConfig
