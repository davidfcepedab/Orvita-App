"use client"

import Link from "next/link"
import { motion } from "framer-motion"
import { Sparkles, ArrowRight } from "lucide-react"
import type { StrategicDayPayload } from "@/lib/insights/buildStrategicDay"

const ACCENT: Record<StrategicDayPayload["primaryLever"]["accent"], { border: string; chip: string }> = {
  health: {
    border: "color-mix(in srgb, var(--color-accent-health) 40%, var(--color-border))",
    chip: "var(--color-accent-health)",
  },
  agenda: {
    border: "color-mix(in srgb, var(--color-accent-agenda) 40%, var(--color-border))",
    chip: "var(--color-accent-agenda)",
  },
  finance: {
    border: "color-mix(in srgb, var(--color-accent-finance) 40%, var(--color-border))",
    chip: "var(--color-accent-finance)",
  },
  profesional: {
    border: "color-mix(in srgb, var(--color-accent-warning) 35%, var(--color-border))",
    chip: "var(--color-accent-warning)",
  },
  checkin: {
    border: "color-mix(in srgb, var(--color-accent-health) 35%, var(--color-border))",
    chip: "var(--color-accent-primary)",
  },
}

type Props = {
  payload: StrategicDayPayload
  loading?: boolean
  /** Título corto encima (ej. “Hoy” vs “Inicio”) */
  eyebrow?: string
}

/**
 * Palanca nº1 + insight correlacionados; glass estilo HIG.
 */
export default function StrategicDayHero({ payload, loading, eyebrow = "Día estratégico" }: Props) {
  const a = ACCENT[payload.primaryLever.accent] ?? ACCENT.checkin

  return (
    <motion.section
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
      className="orv-glass-panel relative overflow-hidden rounded-[1.5rem] border p-5 sm:p-6"
      style={{ borderColor: a.border }}
      aria-busy={loading}
      aria-labelledby="strategic-headline"
    >
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.5]"
        style={{
          background: `radial-gradient(100% 80% at 0% 0%, color-mix(in srgb, ${a.chip} 16%, transparent), transparent 55%)`,
        }}
        aria-hidden
      />
      <div className="relative z-[1] space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <span
            className="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--color-text-secondary)]"
            style={{ borderColor: a.border, background: "color-mix(in srgb, var(--color-surface) 80%, transparent)" }}
          >
            <Sparkles className="h-3 w-3" style={{ color: a.chip }} aria-hidden />
            {eyebrow}
          </span>
        </div>

        <div className="space-y-1.5">
          <h2
            id="strategic-headline"
            className="m-0 text-[1.15rem] font-semibold leading-snug tracking-[-0.02em] text-[var(--color-text-primary)] sm:text-[1.35rem] [text-wrap:balance]"
          >
            {loading ? "…" : payload.headline}
          </h2>
          <p className="m-0 text-sm leading-relaxed text-[var(--color-text-secondary)] [text-wrap:pretty]">
            {loading ? "Sincronizando tu contexto operativo…" : payload.subhead}
          </p>
        </div>

        {payload.insightLines.length > 0 && !loading && (
          <ul className="m-0 list-none space-y-2.5 p-0">
            {payload.insightLines.map((line) => (
              <li
                key={line.slice(0, 80)}
                className="flex gap-2.5 text-[13px] leading-[1.55] text-[var(--color-text-primary)] [text-wrap:pretty]"
              >
                <span
                  className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full"
                  style={{ background: a.chip, opacity: 0.7 }}
                />
                <span>{line}</span>
              </li>
            ))}
          </ul>
        )}

        <div
          className="flex flex-col gap-3 rounded-2xl border border-[var(--color-border)] bg-[color-mix(in_srgb,var(--color-surface)_92%,transparent)] p-4 sm:flex-row sm:items-center sm:justify-between"
        >
          <div className="min-w-0 space-y-1">
            <p className="m-0 text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--color-text-secondary)]">
              Palanca nº 1
            </p>
            <p className="m-0 text-base font-semibold text-[var(--color-text-primary)] [text-wrap:balance]">
              {loading ? "…" : payload.primaryLever.label}
            </p>
            <p className="m-0 text-xs leading-relaxed text-[var(--color-text-secondary)] [text-wrap:pretty]">
              {loading ? "" : payload.primaryLever.description}
            </p>
          </div>
          <Link
            href={payload.primaryLever.href}
            className="orv-apple-cta inline-flex min-h-[48px] shrink-0 items-center justify-center gap-2 self-stretch rounded-[var(--radius-button)] px-5 text-sm font-semibold text-white motion-safe:transition-transform motion-safe:active:scale-[0.99] sm:self-center"
            style={{
              background: `linear-gradient(180deg, color-mix(in srgb, ${a.chip} 92%, #000) 0%, color-mix(in srgb, ${a.chip} 78%, #000) 100%)`,
              textDecoration: "none",
            }}
          >
            {loading ? "…" : payload.primaryLever.cta}
            <ArrowRight className="h-4 w-4 opacity-90" aria-hidden />
          </Link>
        </div>
      </div>
    </motion.section>
  )
}
