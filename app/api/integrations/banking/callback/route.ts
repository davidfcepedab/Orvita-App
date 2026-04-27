import { NextRequest, NextResponse } from "next/server"
import { requireUser } from "@/lib/api/requireUser"
import { connectBankingColombia, mapBelvoInstitutionToProvider } from "@/lib/integrations/banking-colombia"
import { persistBankingConnectionRows } from "@/lib/integrations/persist-banking-connection"

export const runtime = "nodejs"

/**
 * Callback del Hosted Widget Belvo: ?link=<uuid>&institution=<slug>
 * Debe coincidir con BANKING_COLOMBIA_REDIRECT_URI en el token del widget.
 */
export async function GET(req: NextRequest) {
  const base = new URL(req.url).origin
  const redirectFinanzas = NextResponse.redirect(new URL("/finanzas/overview?capital=belvo", base))
  const redirectConfig = (suffix: string) => NextResponse.redirect(new URL(`/configuracion?banking=${suffix}`, base))

  const auth = await requireUser(req)
  if (auth instanceof NextResponse) {
    return NextResponse.redirect(new URL(`/auth?next=${encodeURIComponent("/finanzas/overview")}`, base))
  }

  const { userId, supabase } = auth
  const url = new URL(req.url)
  const event = url.searchParams.get("event")
  if (event === "exit") return redirectConfig("belvo_exit")
  if (event === "error") return redirectConfig("belvo_error")

  const link = url.searchParams.get("link")?.trim()
  const institution = url.searchParams.get("institution")?.trim()
  if (!link) return redirectConfig("belvo_no_link")

  const { data: settings } = await supabase
    .from("integration_settings")
    .select("banking_enabled")
    .eq("user_id", userId)
    .maybeSingle()
  if (!settings?.banking_enabled) {
    return redirectConfig("belvo_disabled")
  }

  const provider = mapBelvoInstitutionToProvider(institution ?? null)

  try {
    const connectedList = await connectBankingColombia({
      provider,
      authCode: link,
      belvoInstitution: institution ?? undefined,
    })
    await persistBankingConnectionRows(supabase, userId, provider, connectedList)
  } catch {
    return redirectConfig("belvo_sync_failed")
  }

  return redirectFinanzas
}
