function requireHevyEnv(): { baseUrl: string; apiKey: string } {
  const baseUrl = process.env.HEVY_BASE_URL?.trim()
  const apiKey = process.env.HEVY_API_KEY?.trim()
  if (!baseUrl) throw new Error("HEVY_BASE_URL is not configured")
  if (!apiKey) throw new Error("HEVY_API_KEY is not configured")
  return { baseUrl, apiKey }
}

/** True when the server can call Hevy (avoids throw before fetch). */
export function isHevyEnvConfigured(): boolean {
  return Boolean(process.env.HEVY_BASE_URL?.trim() && process.env.HEVY_API_KEY?.trim())
}

function buildHevyWorkoutsUrl(baseUrl: string, page: number) {
  // Allow accidental values like ".../docs" or ".../docs/" from Swagger copy-paste.
  const normalizedBase = baseUrl.replace(/\/docs\/?$/i, "").replace(/\/+$/, "")
  const baseWithVersion = /\/v\d+$/i.test(normalizedBase) ? normalizedBase : `${normalizedBase}/v1`
  return `${baseWithVersion}/workouts?page=${page}`
}

export async function fetchHevyWorkouts(page = 1) {
  const { baseUrl, apiKey } = requireHevyEnv()
  const url = buildHevyWorkoutsUrl(baseUrl, page)
  const authVariants: Array<Record<string, string>> = [
    { Accept: "application/json", "api-key": apiKey },
    { Accept: "application/json", "x-api-key": apiKey },
    { Accept: "application/json", Authorization: `Bearer ${apiKey}` },
    { Accept: "application/json", "api-key": apiKey, Authorization: `Bearer ${apiKey}` },
  ]

  let lastStatus = 0
  let lastBody = ""

  for (const headers of authVariants) {
    const res = await fetch(url, { headers, cache: "no-store" })
    if (res.ok) return res.json()
    lastStatus = res.status
    lastBody = await res.text()
    if (res.status !== 401 && res.status !== 403) {
      break
    }
  }

  throw new Error(`Hevy error (${lastStatus}) at ${url}: ${lastBody}`)
}
