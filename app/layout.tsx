import "./globals.css"
import GlobalHeader from "./components/GlobalHeader"
import BottomNav from "./components/BottomNav"

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="es">
      <body className="bg-[#FFFCF7] text-[#0F172A]">

        <div className="container-app">
          <GlobalHeader />

          <div className="pt-6 pb-28 px-6">
            {children}
          </div>
        </div>

        <BottomNav />

      </body>
    </html>
  )
}
