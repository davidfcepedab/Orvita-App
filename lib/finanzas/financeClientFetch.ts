import { browserBearerHeaders } from "@/lib/api/browserBearerHeaders"

export async function financeApiGet(url: string) {
  const headers = await browserBearerHeaders()
  return fetch(url, { cache: "no-store", headers })
}

export async function financeApiDelete(url: string) {
  const headers = await browserBearerHeaders()
  return fetch(url, { method: "DELETE", cache: "no-store", headers })
}

export async function financeApiJson(
  url: string,
  init: { method: "POST" | "PATCH" | "DELETE"; body?: unknown },
) {
  const headers = await browserBearerHeaders()
  const merged = new Headers(headers)
  merged.set("Content-Type", "application/json")
  return fetch(url, {
    method: init.method,
    cache: "no-store",
    headers: merged,
    body: init.body !== undefined ? JSON.stringify(init.body) : undefined,
  })
}
