"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"

export default function Tabs() {
  const pathname = usePathname()

  const tabs = [
    { name: "Físico", href: "/salud" },
    { name: "Finanzas", href: "/finanzas/overview" },
    { name: "Profesional", href: "/profesional" },
    { name: "Sistema", href: "/health" },
  ]

  return (
    <div className="fixed bottom-0 left-0 right-0 mx-auto flex max-w-md justify-between border-t border-orbita-border bg-orbita-surface px-6 py-4 text-xs font-medium">
      {tabs.map(tab => (
        <Link
          key={tab.href}
          href={tab.href}
          className={`transition ${
            pathname === tab.href ||
            (tab.href === "/finanzas/overview" && pathname.startsWith("/finanzas"))
              ? "text-[var(--color-accent-primary)]"
              : "text-orbita-secondary"
          }`}
        >
          {tab.name}
        </Link>
      ))}
    </div>
  )
}
