const BASE_URL = process.env.HEVY_BASE_URL
const API_KEY = process.env.HEVY_API_KEY

if (!BASE_URL) {
  throw new Error("HEVY_BASE_URL is not configured")
}

if (!API_KEY) {
  throw new Error("HEVY_API_KEY is not configured")
}

export async function fetchHevyWorkouts(page = 1) {
  const res = await fetch(`${BASE_URL}/workouts?page=${page}`, {
    headers: {
      Authorization: `Bearer ${API_KEY}`,
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
