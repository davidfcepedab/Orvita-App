function requireHevyEnv(): { baseUrl: string; apiKey: string } {
  const baseUrl = process.env.HEVY_BASE_URL?.trim()
  const apiKey = process.env.HEVY_API_KEY?.trim()
  if (!baseUrl) throw new Error("HEVY_BASE_URL is not configured")
  if (!apiKey) throw new Error("HEVY_API_KEY is not configured")
  return { baseUrl, apiKey }
}

export async function fetchHevyWorkouts(page = 1) {
  const { baseUrl, apiKey } = requireHevyEnv()
  const res = await fetch(`${baseUrl}/workouts?page=${page}`, {
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    cache: "no-store",
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Hevy error: ${text}`)
  }

  return res.json()
}
