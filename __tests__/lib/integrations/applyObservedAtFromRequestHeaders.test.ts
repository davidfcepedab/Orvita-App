import { NextRequest } from "next/server"
import { applyObservedAtFromRequestHeaders } from "@/lib/integrations/applyObservedAtFromRequestHeaders"

function makeReq(headers: Record<string, string>) {
  return new NextRequest(new URL("https://orvita.app/api/integrations/health/apple/import"), {
    method: "POST",
    headers: new Headers(headers),
  })
}

describe("applyObservedAtFromRequestHeaders", () => {
  test("rellena body.observed_at desde x-orvita-observed-at", () => {
    const req = makeReq({ "x-orvita-observed-at": "2026-04-24" })
    const body: Record<string, unknown> = { observed_at: null, steps: 100 }
    applyObservedAtFromRequestHeaders(req, body)
    expect(body.observed_at).toBe("2026-04-24")
  })

  test("x-observed-at como alternativa", () => {
    const req = makeReq({ "x-observed-at": "2025-12-01" })
    const body: Record<string, unknown> = { observed_at: "" }
    applyObservedAtFromRequestHeaders(req, body)
    expect(body.observed_at).toBe("2025-12-01")
  })

  test("no pisa fechas ya presentes", () => {
    const req = makeReq({ "x-orvita-observed-at": "2099-01-01" })
    const body: Record<string, unknown> = { observed_at: "2026-04-20" }
    applyObservedAtFromRequestHeaders(req, body)
    expect(body.observed_at).toBe("2026-04-20")
  })
})
