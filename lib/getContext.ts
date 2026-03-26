type ContextEnvelope = {
  success?: boolean
  data?: unknown
  error?: string
}

function isContextEnvelope(value: unknown): value is ContextEnvelope {
  return !!value && typeof value === "object"
}

export async function getContext(): Promise<unknown | null> {
  try {
    const res = await fetch("/api/context", {
      cache: "no-store",
    })

    if (!res.ok) {
      console.error("Context API error:", res.status)
      return null
    }

    const payload = (await res.json()) as unknown

    if (isContextEnvelope(payload)) {
      if (payload.success && payload.data) {
        return payload.data
      }
      if (payload.success === false) {
        return null
      }
    }

    return payload
  } catch (error) {
    console.error("Error cargando contexto:", error)
    return null
  }
}
