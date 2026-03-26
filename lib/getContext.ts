export async function getContext() {
  try {
    const res = await fetch("/api/context", {
      cache: "no-store",
    })

    if (!res.ok) {
      console.error("Context API error:", res.status)
      return null
    }

    const payload = (await res.json()) as {
      success?: boolean
      data?: unknown
      error?: string
    }

    if (payload && payload.success && payload.data) {
      return payload.data
    }

    if (payload && payload.success === false) {
      return null
    }

    return payload
  } catch (error) {
    console.error("Error cargando contexto:", error)
    return null
  }
}
