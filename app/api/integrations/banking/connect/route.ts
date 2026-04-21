import { NextRequest, NextResponse } from "next/server"
import { requireUser } from "@/lib/api/requireUser"
import { connectBankingColombia } from "@/lib/integrations/banking-colombia"

type BankProvider = "bancolombia" | "davivienda" | "nequi"

export const runtime = "nodejs"

function toBankConnectErrorMessage(error: unknown) {
  const raw = error instanceof Error ? error.message : "No se pudo conectar banco"
  const lower = raw.toLowerCase()
  if (lower.includes("integración bancaria real no configurada")) {
    return "Integración bancaria real no configurada en servidor. Configura BANKING_COLOMBIA_BASE_URL, CLIENT_ID, CLIENT_SECRET y REDIRECT_URI."
  }
  if (lower.includes("oauth bancario falló")) {
    return "El banco rechazó la autorización OAuth. Intenta de nuevo y confirma permisos en el banco."
  }
  return raw
}

export async function POST(req: NextRequest) {
  try {
    const auth = await requireUser(req)
    if (auth instanceof NextResponse) return auth
    const { userId, supabase } = auth
    const body = (await req.json().catch(() => ({}))) as { provider?: BankProvider; code?: string; state?: string }
    const provider = body.provider ?? "bancolombia"
    if (!["bancolombia", "davivienda", "nequi"].includes(provider)) {
      return NextResponse.json({ success: false, error: "Proveedor bancario no soportado." }, { status: 400 })
    }

    const { data: settings } = await supabase
      .from("integration_settings")
      .select("banking_enabled")
      .eq("user_id", userId)
      .maybeSingle()
    if (!settings?.banking_enabled) {
      return NextResponse.json(
        { success: false, error: "Activa Integración Bancaria en Configuración para conectar bancos." },
        { status: 403 },
      )
    }

    const nowIso = new Date().toISOString()
    const connected = await connectBankingColombia({
      provider,
      authCode: body.code,
      state: body.state,
    })

    const { error: connError } = await supabase.from("integration_connections").upsert(
      {
        user_id: userId,
        integration: provider,
        provider_account_id: connected.providerAccountId,
        access_token: connected.accessToken,
        refresh_token: connected.refreshToken,
        connected: true,
        connected_at: nowIso,
        last_synced_at: nowIso,
        metadata: connected.metadata,
        updated_at: nowIso,
      },
      { onConflict: "user_id,integration,provider_account_id" },
    )
    if (connError) throw new Error(connError.message)

    const { error: accountError } = await supabase.from("bank_accounts").upsert(
      {
        user_id: userId,
        provider,
        account_name: connected.accountName,
        account_mask: connected.accountMask,
        balance_available: connected.balanceAvailable,
        balance_current: connected.balanceCurrent,
        last_synced_at: nowIso,
        connected: true,
        metadata: { source: "banking_colombia_real_adapter", ...connected.metadata },
        updated_at: nowIso,
      },
      { onConflict: "user_id,provider,account_mask" },
    )
    if (accountError) throw new Error(accountError.message)

    return NextResponse.json({
      success: true,
      provider,
      connected: true,
      lastSyncAt: nowIso,
      connectionLabel: `Conectado a ${provider[0].toUpperCase()}${provider.slice(1)}`,
    })
  } catch (error) {
    const message = toBankConnectErrorMessage(error)
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}
