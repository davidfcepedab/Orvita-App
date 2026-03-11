"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"

export default function Tabs() {
  const pathname = usePathname()

  const tabs = [
    { name: "Físico", href: "/fisico" },
    { name: "Finanzas", href: "/finanzas" },
    { name: "Profesional", href: "/profesional" },
    { name: "Sistema", href: "/sistema" },
  ]

  return (
    <div className="fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-white border-t border-gray-200 px-6 py-4 flex justify-between text-xs font-medium">
      {tabs.map(tab => (
        <Link
          key={tab.href}
          href={tab.href}
          className={`transition ${
            pathname === tab.href
              ? "text-[#FF2D8E]"
              : "text-gray-400"
          }`}
        >
          {tab.name}
        </Link>
      ))}
    </div>
  )
}
