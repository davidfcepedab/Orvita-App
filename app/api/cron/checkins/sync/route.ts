import { NextRequest, NextResponse } from "next/server"
import { authorizeAutomationRequest } from "@/lib/auth/automationGuard"

/**
 * Ruta histórica en `vercel.json`. Redirige lógica a `/api/cron/notifications/dispatch?jobs=checkin`
 * manteniendo compatibilidad con despliegues que aún apunten aquí.
 */
export const runtime = "nodejs"

export async function GET(req: NextRequest) {
  const denied = authorizeAutomationRequest(req)
  if (denied) return denied

  const u = new URL(req.url)
  const base = `${u.protocol}//${u.host}`
  const target = new URL("/api/cron/notifications/dispatch", base)
  target.searchParams.set("jobs", "checkin")

  const auth = req.headers.get("authorization")
  const xtok = req.headers.get("x-reset-token")
  const headers = new Headers()
  if (auth) headers.set("authorization", auth)
  if (xtok) headers.set("x-reset-token", xtok)

  const res = await fetch(target.toString(), { headers, cache: "no-store" })
  const body = await res.text()
  return new NextResponse(body, { status: res.status, headers: { "content-type": res.headers.get("content-type") ?? "application/json" } })
}
