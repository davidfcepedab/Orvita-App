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
  const normalizedBase = baseUrl.replace(/\/+$/, "")
  const baseWithVersion = /\/v\d+$/i.test(normalizedBase) ? normalizedBase : `${normalizedBase}/v1`
  return `${baseWithVersion}/workouts?page=${page}`
}

export async function fetchHevyWorkouts(page = 1) {
  const { baseUrl, apiKey } = requireHevyEnv()
  const url = buildHevyWorkoutsUrl(baseUrl, page)
  const res = await fetch(url, {
    headers: {
      Accept: "application/json",
      "api-key": apiKey,
      Authorization: `Bearer ${apiKey}`,
    },
    cache: "no-store",
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Hevy error (${res.status}) at ${url}: ${text}`)
  }

  return res.json()
}
