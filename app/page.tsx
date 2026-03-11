"use client"

import { useRouter } from "next/navigation"

export default function Home() {
  const router = useRouter()

  const modules = [
    { name: "Físico", route: "/fisico", color: "#3FC5BB" },
    { name: "Finanzas", route: "/finanzas/overview", color: "#6BCF93" },
    { name: "Profesional", route: "/profesional", color: "#3B82F6" },
    { name: "Sistema", route: "/sistema", color: "#8B7CF6" },
  ]

  return (
    <div className="space-y-10">

{/* =========================
    RESET CORE
========================= */}
<div className="relative rounded-3xl p-8 overflow-hidden bg-white border border-gray-100 shadow-[0_12px_32px_rgba(15,23,42,0.06)]">

  {/* Glow estructural */}
  <div className="absolute -top-12 -right-12 w-48 h-48 bg-gradient-to-br from-[#3FC5BB]/20 to-[#A78BFA]/20 blur-3xl rounded-full" />

  <p className="text-xs uppercase tracking-widest text-gray-400">
    Arquitectura Ejecutiva
  </p>

  <h2 className="text-4xl font-bold mt-4 tracking-tight text-[#0F172A]">
    RESET OS
  </h2>

  <p className="mt-4 text-sm text-gray-500 leading-relaxed max-w-sm">
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
            background:
              "linear-gradient(135deg, #3FC5BB, #8B7CF6)",
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
              border: `1px solid ${mod.color}30`,
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
