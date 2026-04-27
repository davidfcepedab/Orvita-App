import { NextRequest, NextResponse } from "next/server"
import { requireUser } from "@/lib/api/requireUser"
import {
  connectBankingColombia,
  createBelvoWidgetSession,
  isBelvoBankingConfigured,
} from "@/lib/integrations/banking-colombia"
import { persistBankingConnectionRows } from "@/lib/integrations/persist-banking-connection"

type BankProvider = "bancolombia" | "davivienda" | "nequi"

export const runtime = "nodejs"

function toBankConnectErrorMessage(error: unknown) {
  const raw = error instanceof Error ? error.message : "No se pudo conectar banco"
  const lower = raw.toLowerCase()
  if (lower.includes("integración bancaria real no configurada")) {
    return "Integración bancaria real no configurada en servidor. Configura BANKING_COLOMBIA_BASE_URL, CLIENT_ID, CLIENT_SECRET y REDIRECT_URI."
  }
  if (lower.includes("belvo")) {
    return raw.length > 280 ? `${raw.slice(0, 280)}…` : raw
  }
  return raw
}

export async function POST(req: NextRequest) {
  try {
    const auth = await requireUser(req)
    if (auth instanceof NextResponse) return auth
    const { userId, supabase } = auth
    const body = (await req.json().catch(() => ({}))) as {
      provider?: BankProvider
      code?: string
      state?: string
      flow?: "register" | "widget"
      belvoInstitution?: string
    }
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

    if (body.flow === "widget") {
      if (!isBelvoBankingConfigured()) {
        return NextResponse.json(
          { success: false, error: "Belvo no está configurado en el servidor (variables BANKING_COLOMBIA_*)." },
          { status: 503 },
        )
      }
      const session = await createBelvoWidgetSession({ locale: "es" })
      return NextResponse.json({
        success: true,
        flow: "widget",
        widgetAccessToken: session.access,
        widgetUrl: session.widgetUrl,
        connectionLabel: "Completa el enlace en la ventana de Belvo Sandbox.",
      })
    }

    const connectedList = await connectBankingColombia({
      provider,
      authCode: body.code,
      state: body.state,
      belvoInstitution: body.belvoInstitution,
    })

    const { nowIso, accountsLinked, connectionLabel } = await persistBankingConnectionRows(
      supabase,
      userId,
      provider,
      connectedList,
    )

    return NextResponse.json({
      success: true,
      provider,
      connected: true,
      lastSyncAt: nowIso,
      accountsLinked,
      connectionLabel,
      integrationBackend: "belvo",
    })
  } catch (error) {
    const message = toBankConnectErrorMessage(error)
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}
