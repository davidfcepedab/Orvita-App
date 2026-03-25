import type { NextRequest } from "next/server"

export function authorizeAutomationRequest(req: NextRequest) {
  const cronSecret = process.env.CRON_SECRET?.trim()
  const internalToken = process.env.INTERNAL_API_TOKEN?.trim()

  // En dev/local se permite si no hay secretos configurados.
  if (!cronSecret && !internalToken) {
    return null
  }

  const authorization = req.headers.get("authorization")?.trim()
  if (cronSecret && authorization === `Bearer ${cronSecret}`) {
    return null
  }

  const headerToken = req.headers.get("x-reset-token")?.trim()
  if (internalToken && headerToken === internalToken) {
    return null
  }

  return new Response(JSON.stringify({ error: "Unauthorized" }), {
    status: 401,
    headers: { "content-type": "application/json" },
  })
}

