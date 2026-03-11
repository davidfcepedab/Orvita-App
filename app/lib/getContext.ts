export async function getContext() {
  const res = await fetch("http://127.0.0.1:8000/api/context", {
    next: { revalidate: 120 }, // cache 120 segundos
  })

  if (!res.ok) throw new Error("Backend error")

  return res.json()
}
