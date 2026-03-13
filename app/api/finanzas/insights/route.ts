import { NextResponse } from "next/server"
import { financialInsightsEngine } from "@/lib/engines/financialInsightsEngine"

export async function GET() {
  try {
    // En producción NO se debe llamar a localhost
    const baseUrl =
      process.env.NODE_ENV === "production"
        ? process.env.VERCEL_URL
          ? `https://${process.env.VERCEL_URL}`
          : ""
        : "http://localhost:3000"

    const res = await fetch(`${baseUrl}/api/finanzas/categories`)
    const data = await res.json()

    if (!data?.data) {
      return NextResponse.json({ insights: [] })
    }

    const insights = financialInsightsEngine({
      categories: data.data.structuralCategories || [],
      flujo: data.data.totalStructural || 0,
    })

    return NextResponse.json({ insights })

  } catch (error: any) {
    console.error("INSIGHTS ERROR:", error?.message)

    return NextResponse.json(
      { error: "Error cargando insights" },
      { status: 500 }
    )
  }
}
