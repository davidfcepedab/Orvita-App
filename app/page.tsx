"use client"

import { useRouter } from "next/navigation"

export default function Home() {
  const router = useRouter()

  const modules = [
    { name: "Salud", route: "/salud", color: "#34D399", background: "rgba(167,243,208,0.35)" },
    { name: "Finanzas", route: "/finanzas/overview", color: "#38BDF8", background: "rgba(186,230,253,0.35)" },
    { name: "Coach", route: "/profesional", color: "#6366F1", background: "rgba(199,210,254,0.35)" },
    { name: "Sistema", route: "/sistema", color: "#F59E0B", background: "rgba(253,230,138,0.4)" },
  ]

  return (
    <div className="space-y-10">

{/* =========================
    RESET CORE
========================= */}
<div className="relative overflow-hidden rounded-3xl border border-white/80 bg-[linear-gradient(135deg,rgba(167,243,208,0.22),rgba(255,255,255,0.96),rgba(199,210,254,0.22))] p-8 shadow-[0_12px_32px_rgba(15,23,42,0.06)]">

  {/* Glow estructural */}
  <div className="absolute -right-12 -top-12 h-48 w-48 rounded-full bg-gradient-to-br from-[#A7F3D0]/40 to-[#C7D2FE]/40 blur-3xl" />

  <p className="text-xs uppercase tracking-widest text-[var(--text-muted)]">
    Arquitectura Ejecutiva
  </p>

  <h2 className="mt-4 text-4xl font-bold tracking-tight text-[var(--text-primary)]">
    RESET OS
  </h2>

  <p className="mt-4 max-w-sm text-sm leading-relaxed text-[var(--text-secondary)]">
    Framework integrado para dirección estratégica personal.
    Unifica energía, capital, carrera y sistema operativo.
  </p>

</div>

      {/* CTA PRINCIPAL */}
      <div>
        <button
          onClick={() => router.push("/checkin")}
          className="w-full py-4 rounded-2xl font-semibold text-white"
          style={{
            background: "linear-gradient(135deg, #34D399, #6366F1)",
          }}
        >
          Hacer Check-In Diario
        </button>
      </div>

      {/* MÓDULOS */}
      <div className="grid grid-cols-2 gap-4">
        {modules.map((mod) => (
          <div
            key={mod.name}
            onClick={() => router.push(mod.route)}
            className="card cursor-pointer text-center"
            style={{
              border: `1px solid ${mod.color}35`,
              backgroundColor: mod.background,
            }}
          >
            <p
              className="text-xs uppercase tracking-wide"
              style={{ color: mod.color }}
            >
              {mod.name}
            </p>

            <p
              className="text-xl font-semibold mt-3"
              style={{ color: mod.color }}
            >
              Entrar
            </p>
          </div>
        ))}
      </div>

    </div>
  )
}
