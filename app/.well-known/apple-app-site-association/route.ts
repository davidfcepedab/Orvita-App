import { NextResponse } from "next/server"
import { buildAppleAppSiteAssociationBody } from "@/lib/apple/buildAasaBody"

export const runtime = "nodejs"

/**
 * Sirve el AASA cuando `ORVITA_APPLE_APP_IDS` está definido (TeamID.bundleId, coma-separados).
 * Sin variable: 404 para no publicar un JSON vacío en producción.
 */
export function GET() {
  const raw = process.env.ORVITA_APPLE_APP_IDS?.trim()
  if (!raw) {
    return new NextResponse(null, { status: 404 })
  }

  const body = buildAppleAppSiteAssociationBody(raw.split(","))
  if (!body) {
    return new NextResponse(null, { status: 404 })
  }

  return NextResponse.json(body, {
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "public, max-age=300",
    },
  })
}
