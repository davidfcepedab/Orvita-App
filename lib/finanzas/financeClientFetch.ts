import { browserBearerHeaders } from "@/lib/api/browserBearerHeaders"

const FINANCE_FETCH_TIMEOUT_MS = 90_000

function financeFetchSignal(): AbortSignal | undefined {
  if (typeof AbortSignal !== "undefined" && typeof AbortSignal.timeout === "function") {
    return AbortSignal.timeout(FINANCE_FETCH_TIMEOUT_MS)
  }
  if (typeof AbortController !== "undefined") {
    const c = new AbortController()
    setTimeout(() => c.abort(), FINANCE_FETCH_TIMEOUT_MS)
    return c.signal
  }
  return undefined
}

export async function financeApiGet(url: string) {
  const headers = await browserBearerHeaders()
  const signal = financeFetchSignal()
  return fetch(url, { cache: "no-store", headers, ...(signal ? { signal } : {}) })
}

export async function financeApiDelete(url: string) {
  const headers = await browserBearerHeaders()
  const signal = financeFetchSignal()
  return fetch(url, { method: "DELETE", cache: "no-store", headers, ...(signal ? { signal } : {}) })
}

export async function financeApiJson(
  url: string,
  init: { method: "POST" | "PATCH" | "DELETE"; body?: unknown },
) {
  const headers = await browserBearerHeaders()
  const merged = new Headers(headers)
  merged.set("Content-Type", "application/json")
  const signal = financeFetchSignal()
  return fetch(url, {
    method: init.method,
    cache: "no-store",
    headers: merged,
    body: init.body !== undefined ? JSON.stringify(init.body) : undefined,
    ...(signal ? { signal } : {}),
  })
}
