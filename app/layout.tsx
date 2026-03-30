import "./globals.css"
import Providers from "@/app/providers"
import { ThemeProvider } from "@/src/theme/ThemeProvider"
import { AppShell } from "@/src/components/layout/AppShell"
import BottomNav from "@/app/components/BottomNav"

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="es">
      <body>
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

