import "./globals.css"
import type { Metadata, Viewport } from "next"
import Script from "next/script"
import Providers from "@/app/providers"
import { AppShell } from "@/src/components/layout/AppShell"
import BottomNav from "@/app/components/BottomNav"
import { ScrollAreaWithBottomInset } from "@/app/components/ScrollAreaWithBottomInset"
import { siteOrigin } from "@/lib/site/origin"

export const metadata: Metadata = {
  metadataBase: new URL(siteOrigin()),
  title: {
    default: "Órvita",
    template: "%s · Órvita",
  },
  description: "Sistema operativo estratégico — salud, capital, agenda y decisión.",
  manifest: "/manifest.json",
  applicationName: "ÓRVITA",
  appleWebApp: {
    capable: true,
    title: "ÓRVITA",
    statusBarStyle: "black-translucent",
  },
  formatDetection: {
    telephone: false,
  },
  icons: {
    icon: [
      { url: "/pwa/icon-192.png", type: "image/png", sizes: "192x192" },
      { url: "/pwa/icon-512.png", type: "image/png", sizes: "512x512" },
    ],
    apple: [{ url: "/pwa/icon-192.png", type: "image/png", sizes: "192x192" }],
    shortcut: ["/pwa/icon-192.png"],
  },
}

/**
 * Escalado en móvil + safe areas (viewport-fit=cover).
 * theme-color por defecto Arctic; `AppProvider` actualiza meta theme-color al cambiar tema (Safari / PWA).
 */
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#0A0A0A",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const figmaCapture = process.env.NEXT_PUBLIC_FIGMA_CAPTURE === "1"

  return (
    <html lang="es">
      <body className="orbita-app-root orv-apple-text">
        {figmaCapture ? (
          <Script
            src="https://mcp.figma.com/mcp/html-to-design/capture.js"
            strategy="afterInteractive"
          />
        ) : null}
        <Providers>
          <AppShell showSidebar={false}>
            {/* ← V3 RECONSTRUIDO: fiel a captura + navegación preservada */}
            <ScrollAreaWithBottomInset>{children}</ScrollAreaWithBottomInset>
          </AppShell>
          <BottomNav />
        </Providers>
      </body>
    </html>
  )
}

