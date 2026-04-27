import { NextRequest, NextResponse } from "next/server"
import { requireUser } from "@/lib/api/requireUser"
import {
  connectBankingColombia,
  createBelvoWidgetSession,
  isBelvoBankingConfigured,
  isBelvoSandbox,
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
  if (lower.includes("username_type")) {
    return "Belvo requiere tipo de usuario (103 o 104) para este banco. Usa variables BANKING_BELVO_SANDBOX_USERNAME_TYPE o conecta con una institución Colombia en Vercel."
  }
  if (lower.includes("widget") && lower.includes("invalid")) {
    return "Belvo rechazó la configuración del widget. Revisa BANKING_COLOMBIA_REDIRECT_URI (https, coincide con el callback) y vuelve a intentar."
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
      /** 103 o 104 para enlaces Colombia (Belvo). */
      username_type?: number
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

    const usernameType =
      typeof body.username_type === "number" && (body.username_type === 103 || body.username_type === 104)
        ? body.username_type
        : undefined

    const connectedList = await connectBankingColombia({
      provider,
      authCode: body.code,
      state: body.state,
      belvoInstitution: body.belvoInstitution,
      usernameType,
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
      belvoSandbox: isBelvoSandbox(),
    })
  } catch (error) {
    const message = toBankConnectErrorMessage(error)
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}
