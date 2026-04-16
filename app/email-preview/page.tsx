import { notFound } from "next/navigation"
import { morningDigestHtml, weeklyDigestHtml } from "@/lib/email/digestTemplatesHtml"
import { morningDigestEmail, weeklyDigestEmail } from "@/lib/email/templates"
import { plainTextToResendHtml } from "@/lib/email/sendOrvitaEmail"
import { localYmdInTimezone } from "@/lib/notifications/cron/timeHelpers"

const DEFAULT_DEMO_EMAIL = "davidf.cbedoya@gmail.com"
const DEFAULT_DEMO_NAME = "David"

type EmailPreviewPageProps = {
  searchParams: Promise<{ email?: string; nombre?: string }>
}

/**
 * Vista previa con sobre simulado (De / Para / Asunto) y saludo con nombre.
 * Query: ?email=...&nombre=... (por defecto ejemplo con tu correo de prueba).
 * Solo en desarrollo.
 */
export default async function EmailPreviewPage({ searchParams }: EmailPreviewPageProps) {
  if (process.env.NODE_ENV === "production") {
    notFound()
  }

  const sp = await searchParams
  const toEmail = (sp.email?.trim() || DEFAULT_DEMO_EMAIL).slice(0, 120)
  const greetingFirstName = (sp.nombre?.trim() || DEFAULT_DEMO_NAME).slice(0, 40)

  const tz = "America/Bogota"
  const ymd = localYmdInTimezone(tz)

  const fromDisplay =
    process.env.EMAIL_FROM?.trim() || "Órvita <notifications@resend.dev>"

  const morningRich = morningDigestHtml({ dateYmd: ymd, greetingFirstName })
  const weeklyRich = weeklyDigestHtml({ dateYmd: ymd, greetingFirstName })
  const morningText = morningDigestEmail({ dateLabel: ymd, greetingFirstName })
  const weeklyText = weeklyDigestEmail({ dateLabel: ymd, greetingFirstName })
  const morningFallbackHtml = plainTextToResendHtml(morningText)
  const weeklyFallbackHtml = plainTextToResendHtml(weeklyText)

  const subjectMorning = "Órvita — Informe de pulso"
  const subjectWeekly = "Órvita — Cierre de semana"

  return (
    <div className="mx-auto min-h-0 max-w-3xl space-y-10 px-4 py-10">
      <header className="space-y-2">
        <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Solo desarrollo</p>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Correo completo (ejemplo con tu perfil)</h1>
        <p className="text-sm leading-relaxed text-slate-600">
          Abajo ves el mismo HTML y texto que enviaría Resend, con <strong className="font-medium">saludo</strong>{" "}
          incluido. En producción el nombre sale del perfil de Supabase (nombre en la cuenta o derivado del correo).
        </p>
        <p className="text-xs text-slate-500">
          Para: <span className="font-mono text-slate-700">{toEmail}</span> · Nombre en saludo:{" "}
          <span className="font-mono text-slate-700">{greetingFirstName}</span>
        </p>
        <p className="text-xs text-slate-500">
          Otro ejemplo:{" "}
          <a className="text-teal-700 underline" href="/email-preview?email=otro@correo.com&nombre=Ana">
            /email-preview?email=otro@correo.com&nombre=Ana
          </a>
        </p>
      </header>

      <RichEmailBlock
        title="Informe de pulso"
        subject={subjectMorning}
        fromDisplay={fromDisplay}
        toEmail={toEmail}
        html={morningRich}
        textFallbackLabel="Versión solo texto (fallback)"
        fallbackHtml={morningFallbackHtml}
        plainText={morningText}
      />

      <RichEmailBlock
        title="Cierre de semana"
        subject={subjectWeekly}
        fromDisplay={fromDisplay}
        toEmail={toEmail}
        html={weeklyRich}
        textFallbackLabel="Versión solo texto (fallback)"
        fallbackHtml={weeklyFallbackHtml}
        plainText={weeklyText}
      />

      <footer className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-xs text-slate-600">
        <p className="font-semibold text-slate-800">Archivos</p>
        <ul className="mt-2 list-inside list-disc space-y-1 font-mono text-[11px]">
          <li>lib/email/digestTemplatesHtml.ts</li>
          <li>lib/email/templates.ts</li>
          <li>lib/email/digestGreeting.ts (nombre en cron)</li>
          <li>lib/notifications/cron/jobs/digests.ts</li>
        </ul>
      </footer>
    </div>
  )
}

function RichEmailBlock({
  title,
  subject,
  fromDisplay,
  toEmail,
  html,
  textFallbackLabel,
  fallbackHtml,
  plainText,
}: {
  title: string
  subject: string
  fromDisplay: string
  toEmail: string
  html: string
  textFallbackLabel: string
  fallbackHtml: string
  plainText: string
}) {
  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-base font-semibold text-slate-900">{title}</h2>
      </div>

      <div
        className="rounded-xl border border-slate-200 bg-slate-100/80 p-4 text-sm shadow-inner"
        aria-label="Sobre del correo (simulado)"
      >
        <dl className="space-y-2 text-slate-700">
          <div className="flex flex-col gap-0.5 sm:flex-row sm:gap-2">
            <dt className="shrink-0 text-xs font-semibold uppercase tracking-wide text-slate-500">De</dt>
            <dd className="min-w-0 break-all font-mono text-xs text-slate-800">{fromDisplay}</dd>
          </div>
          <div className="flex flex-col gap-0.5 sm:flex-row sm:gap-2">
            <dt className="shrink-0 text-xs font-semibold uppercase tracking-wide text-slate-500">Para</dt>
            <dd className="min-w-0 break-all font-mono text-xs text-slate-800">{toEmail}</dd>
          </div>
          <div className="flex flex-col gap-0.5 sm:flex-row sm:gap-2">
            <dt className="shrink-0 text-xs font-semibold uppercase tracking-wide text-slate-500">Asunto</dt>
            <dd className="min-w-0 font-medium text-slate-900">{subject}</dd>
          </div>
        </dl>
      </div>

      <div>
        <p className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-500">Cuerpo HTML</p>
        <iframe
          title={`Vista previa: ${title}`}
          srcDoc={html}
          className="h-[720px] w-full rounded-xl border border-slate-200 bg-white shadow-sm"
          sandbox="allow-same-origin"
        />
      </div>

      <details className="group rounded-lg border border-slate-200 bg-slate-50">
        <summary className="cursor-pointer list-none px-4 py-3 text-sm font-medium text-slate-700 [&::-webkit-details-marker]:hidden">
          {textFallbackLabel}
          <span className="ml-2 text-xs font-normal text-slate-500">(desplegar)</span>
        </summary>
        <div className="space-y-3 border-t border-slate-200 px-4 pb-4 pt-3">
          <p className="text-[11px] text-slate-500">
            Campo <span className="font-mono">text</span> de Resend (clientes sin HTML o respaldo):
          </p>
          <div
            className="overflow-x-auto rounded-md border border-slate-200 bg-white p-3 text-xs [&_pre]:m-0 [&_pre]:whitespace-pre-wrap [&_pre]:font-mono"
            dangerouslySetInnerHTML={{ __html: fallbackHtml }}
          />
          <pre className="max-h-48 overflow-auto rounded-md border border-dashed border-slate-300 bg-white p-3 text-[11px] leading-relaxed text-slate-700">
            {plainText}
          </pre>
        </div>
      </details>
    </section>
  )
}
