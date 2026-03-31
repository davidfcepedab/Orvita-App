import { NextRequest } from "next/server"
import { hasUsableOrvitaSessionCookie, ORVITA_AUTH_COOKIE } from "@/lib/auth/middlewareSession"

function b64url(obj: object) {
  return Buffer.from(JSON.stringify(obj), "utf8")
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "")
}

describe("hasUsableOrvitaSessionCookie", () => {
  test("sin cookie → false", () => {
    const req = new NextRequest("https://orvita.app/hoy")
    expect(hasUsableOrvitaSessionCookie(req)).toBe(false)
  })

  test("JWT con exp futuro → true", () => {
    const exp = Math.floor(Date.now() / 1000) + 3600
    const token = `x.${b64url({ exp })}.y`
    const req = new NextRequest("https://orvita.app/hoy", {
      headers: { cookie: `${ORVITA_AUTH_COOKIE}=${token}` },
    })
    expect(hasUsableOrvitaSessionCookie(req)).toBe(true)
  })

  test("JWT con exp pasado → false", () => {
    const exp = Math.floor(Date.now() / 1000) - 10_000
    const token = `x.${b64url({ exp })}.y`
    const req = new NextRequest("https://orvita.app/hoy", {
      headers: { cookie: `${ORVITA_AUTH_COOKIE}=${token}` },
    })
    expect(hasUsableOrvitaSessionCookie(req)).toBe(false)
  })
})
