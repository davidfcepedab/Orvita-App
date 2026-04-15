/**
 * Envío de correo vía [Resend](https://resend.com) API REST (sin dependencia npm).
 * Si falta RESEND_API_KEY, solo registra en consola (desarrollo).
 */

export type SendEmailArgs = {
  to: string
  subject: string
  text: string
  html?: string
  /** Para trazas / categorización futura */
  category?: string
}

export async function sendOrvitaEmail(args: SendEmailArgs): Promise<{ ok: boolean; error?: string }> {
  const key = process.env.RESEND_API_KEY?.trim()
  const from = process.env.EMAIL_FROM?.trim() || "Órvita <notifications@resend.dev>"

  if (!key) {
    console.warn("[email] RESEND_API_KEY no configurada; no se envía:", args.subject)
    return { ok: false, error: "no_resend_key" }
  }

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: [args.to],
        subject: args.subject,
        text: args.text,
        html: args.html ?? `<pre>${escapeHtml(args.text)}</pre>`,
      }),
    })

    if (!res.ok) {
      const errText = await res.text()
      console.error("[email] Resend error:", res.status, errText)
      return { ok: false, error: errText }
    }

    return { ok: true }
  } catch (e) {
    const msg = e instanceof Error ? e.message : "fetch error"
    console.error("[email]", msg)
    return { ok: false, error: msg }
  }
}

function escapeHtml(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
}
