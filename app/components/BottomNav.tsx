"use client"

import { usePathname, useRouter } from "next/navigation"

export default function BottomNav() {
  const pathname = usePathname()
  const router = useRouter()

  const tabs = [
    { name: "Inicio", route: "/" },
    { name: "Físico", route: "/fisico" },
    { name: "Finanzas", route: "/finanzas" },
    { name: "Profesional", route: "/profesional" },
    { name: "Sistema", route: "/sistema" },
  ]

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 shadow-[0_-5px_20px_rgba(15,23,42,0.05)]">
      <div className="max-w-md mx-auto grid grid-cols-5 text-center py-3 text-sm">

        {tabs.map((tab) => {
          const active = pathname === tab.route

          return (
            <button
              key={tab.name}
              onClick={() => router.push(tab.route)}
              className={`transition ${
                active
                  ? "text-[#0F172A] font-semibold"
                  : "text-gray-400"
              }`}
            >
              {tab.name}
            </button>
          )
        })}

      </div>
    </div>
  )
}
