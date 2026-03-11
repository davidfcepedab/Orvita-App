export async function getContext() {
  try {
    const res = await fetch("/api/context", {
      cache: "no-store",
    })

    if (!res.ok) {
      console.error("Context API error:", res.status)
      return null
    }

    return await res.json()
  } catch (error) {
    console.error("Error cargando contexto:", error)
    return null
  }
}
