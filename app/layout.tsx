import "./globals.css"
import Providers from "@/app/providers"
import V3Shell from "@/app/components/orbita-v3/V3Shell"
import { ThemeProvider } from "@/src/theme/ThemeProvider"

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
            <V3Shell>{children}</V3Shell>
          </Providers>
        </ThemeProvider>
      </body>
    </html>
  )
}
