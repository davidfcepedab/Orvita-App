import { NextRequest, NextResponse } from "next/server"
// TODO: Implementar categories usando cálculos centralizados y getTransactions

export async function GET(req: NextRequest) {
  try {
    // Implementar lógica de categories aquí
    return NextResponse.json({ success: true, data: {} })
  } catch (error: any) {
    console.error("CATEGORIES ERROR:", error?.message)
    return NextResponse.json(
      { success: false, error: "Error cargando categorías" },
      { status: 500 }
    )
  }
}
