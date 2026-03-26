import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export type AuthedRequest = {
  supabase: ReturnType<typeof createClient>
  userId: string
}

function extractBearerToken(req: NextRequest) {
  const header = req.headers.get("authorization")
  if (!header) return null
  const [type, token] = header.split(" ")
  if (type?.toLowerCase() !== "bearer" || !token) return null
  return token.trim()
}

export async function requireUser(req: NextRequest): Promise<AuthedRequest | NextResponse> {
  const token = extractBearerToken(req)
  if (!token) {
    return NextResponse.json(
      { success: false, error: "Unauthorized: missing bearer token" },
      { status: 401 }
    )
  }

  const supabase = createClient({ accessToken: token })
  const { data, error } = await supabase.auth.getUser()

  if (error || !data.user) {
    return NextResponse.json(
      { success: false, error: "Unauthorized: invalid token" },
      { status: 401 }
    )
  }

  return { supabase, userId: data.user.id }
}
