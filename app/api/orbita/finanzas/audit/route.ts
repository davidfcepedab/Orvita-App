import { NextRequest, NextResponse } from "next/server"
import { requireUser } from "@/lib/api/requireUser"

function monthRangeUtcIso(ym: string): { start: string; end: string } | null {
  const m = /^(\d{4})-(\d{2})$/.exec(ym.trim())
  if (!m) return null
  const y = Number(m[1])
  const mo = Number(m[2])
  if (mo < 1 || mo > 12) return null
  const start = new Date(Date.UTC(y, mo - 1, 1))
  const end = new Date(Date.UTC(y, mo, 1))
  return { start: start.toISOString(), end: end.toISOString() }
}

export async function GET(req: NextRequest) {
  try {
    const auth = await requireUser(req)
    if (auth instanceof NextResponse) return auth

    const { supabase } = auth
    const { searchParams } = new URL(req.url)

    const limit = Math.min(Number(searchParams.get("limit") ?? 50), 200)
    const page = Math.max(Number(searchParams.get("page") ?? 1), 1)

    const from = (page - 1) * limit
    const to = from + limit - 1

    const monthParam = searchParams.get("month")
    const range = monthParam ? monthRangeUtcIso(monthParam) : null

    let query = supabase
      .from("finance_transaction_audit")
      .select("*", { count: "exact" })

    if (range) {
      query = query.gte("changed_at", range.start).lt("changed_at", range.end)
    }

    const result = await query
      .order("changed_at", { ascending: false })
      .range(from, to)

    if (result.error) {
      throw result.error
    }

    return NextResponse.json({
      success: true,
      data: result.data,
      pagination: {
        page,
        limit,
        total: result.count ?? 0,
      },
    })
  } catch (error: unknown) {
    const message =
      error instanceof Error
        ? error.message
        : "Error cargando auditoría"

    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    )
  }
}
