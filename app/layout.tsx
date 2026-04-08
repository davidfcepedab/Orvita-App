import "./globals.css"
import type { Metadata } from "next"
import Script from "next/script"
import Providers from "@/app/providers"
import { ThemeProvider } from "@/src/theme/ThemeProvider"
import { AppShell } from "@/src/components/layout/AppShell"
import BottomNav from "@/app/components/BottomNav"

export const metadata: Metadata = {
  title: {
    default: "Órvita",
    template: "%s · Órvita",
  },
  description: "Sistema operativo estratégico — salud, capital, agenda y decisión.",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const figmaCapture = process.env.NEXT_PUBLIC_FIGMA_CAPTURE === "1"

  return (
    <html lang="es">
      <body>
        {figmaCapture ? (
          <Script
            src="https://mcp.figma.com/mcp/html-to-design/capture.js"
            strategy="afterInteractive"
          />
        ) : null}
        <ThemeProvider>
          <Providers>
            <AppShell showSidebar={false}>
              {/* ← V3 RECONSTRUIDO: fiel a captura + navegación preservada */}
              <div className="min-w-0 max-w-full w-full pb-[calc(4.75rem+env(safe-area-inset-bottom,0px))]">
                {children}
              </div>
            </AppShell>
            <BottomNav />
          </Providers>
        </ThemeProvider>
      </body>
    </html>
  )
}

