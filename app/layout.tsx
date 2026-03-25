import "./globals.css"
import BottomNav from "@/app/components/BottomNav"

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="es">
      <body className="min-h-screen flex flex-col bg-[var(--bg-app)]">

        <header className="border-b border-white/60 bg-[linear-gradient(135deg,rgba(167,243,208,0.45),rgba(186,230,253,0.45),rgba(199,210,254,0.35))] px-6 py-6 shadow-[0_10px_28px_rgba(15,23,42,0.04)] backdrop-blur-xl">
          <div className="mx-auto max-w-5xl">
            <p className="text-xs uppercase tracking-[0.24em] text-[var(--text-muted)]">Orbit Control</p>
            <h1 className="mt-2 text-2xl font-semibold tracking-tight text-[var(--text-primary)]">
              Orvita Personal Operating System
            </h1>
            <p className="mt-1 text-sm text-[var(--text-secondary)]">
              Fresh Strategic Minimalism para energia, capital y direccion operativa.
            </p>
          </div>
        </header>

        <main className="mx-auto flex-1 w-full max-w-6xl px-4 py-6 pb-28 sm:px-6">
          {children}
        </main>

        <BottomNav />

      </body>
    </html>
  )
}
