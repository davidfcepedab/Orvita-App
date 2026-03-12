import "./globals.css"
import Link from "next/link"

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="es">
      <body className="min-h-screen flex flex-col bg-[#F5F1EB]">

        <header className="bg-gradient-to-r from-emerald-400 to-emerald-500 rounded-b-3xl p-6 shadow-md">
          <div className="max-w-5xl mx-auto">
            <p className="text-sm text-white/80">FINANZAS</p>
            <h1 className="text-2xl font-semibold text-white">
              Control Estratégico
            </h1>
          </div>
        </header>

        <main className="flex-1 max-w-5xl mx-auto w-full px-4 py-6 pb-24">
          {children}
        </main>

        <footer className="fixed bottom-0 left-0 right-0 bg-white border-t h-16 flex justify-around items-center shadow-sm">
          <Link href="/">Inicio</Link>
          <Link href="/fisico">Físico</Link>
          <Link href="/finanzas/overview">Finanzas</Link>
          <Link href="/profesional">Profesional</Link>
          <Link href="/sistema">Sistema</Link>
        </footer>

      </body>
    </html>
  )
}
