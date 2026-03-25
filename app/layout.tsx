import "./globals.css"
import Providers from "@/app/providers"
import V3Shell from "@/app/components/orbita-v3/V3Shell"

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="es">
      <body>
        <Providers>
          <V3Shell>{children}</V3Shell>
        </Providers>
      </body>
    </html>
  )
}
