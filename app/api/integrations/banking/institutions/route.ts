import { NextRequest, NextResponse } from "next/server"
import { requireUser } from "@/lib/api/requireUser"
import { listBelvoInstitutions } from "@/lib/integrations/banking-colombia"

export const runtime = "nodejs"

export async function GET(req: NextRequest) {
  try {
    const auth = await requireUser(req)
    if (auth instanceof NextResponse) return auth

    const url = new URL(req.url)
    const country = (url.searchParams.get("country") || "CO").toUpperCase()
    if (country !== "CO" && country !== "BR") {
      return NextResponse.json({ success: false, error: "country debe ser CO o BR" }, { status: 400 })
    }

    const rows = await listBelvoInstitutions({ countryCode: country })
    return NextResponse.json({
      success: true,
      country,
      total: rows.length,
      institutions: rows,
      hint:
        rows.length === 0
          ? "No hay instituciones en este país para tu cuenta sandbox. Prueba country=BR o revisa permisos en Belvo."
          : undefined,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : "No se pudo listar instituciones Belvo"
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}
