import { NextResponse } from "next/server"
import { financialInsightsEngine } from "@/lib/engines/financialInsightsEngine"

export async function GET() {
  try {
    const res = await fetch("http://localhost:3000/api/finanzas/categories")
    const data = await res.json()

    const insights = financialInsightsEngine({
      categories: data.categories,
      flujo: -1, // puedes conectar flujo real luego
    })

    return NextResponse.json({ insights })

  } catch (error) {
    return NextResponse.json(
      { error: "Error cargando insights" },
      { status: 500 }
    )
  }
}

