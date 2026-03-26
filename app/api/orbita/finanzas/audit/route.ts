import { NextRequest, NextResponse } from "next/server"
import { requireUser } from "@/lib/api/requireUser"

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

    const result = await supabase
      .from("finance_transaction_audit")
      .select("*", { count: "exact" })
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
