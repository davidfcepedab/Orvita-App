import { NextRequest, NextResponse } from "next/server"

import { requireUser } from "@/lib/api/requireUser"
import { isAppMockMode } from "@/lib/checkins/flags"
import type { OrbitaInsight } from "@/app/home/_lib/orbita-home-types"

export const runtime = "nodejs"

function seedFromIsoMinute(iso: string) {
  let h = 2166136261
  for (let i = 0; i < iso.length; i++) {
    h ^= iso.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

export async function POST(req: NextRequest) {
  try {
    // En mock mode permitimos la acción sin auth para demos.
    if (!isAppMockMode()) {
      const auth = await requireUser(req)
      if (auth instanceof NextResponse) return auth
      void auth
    }

    // Generación determinística por minuto: siempre “cambia” con el tiempo y evita UI estática.
    const nowIsoMinute = new Date().toISOString().slice(0, 16) // YYYY-MM-DDTHH:MM
    const seed = seedFromIsoMinute(nowIsoMinute)

    const insights: OrbitaInsight[] = [
      {
        id: `ins-${seed}-pressure`,
        title: "Actualización: presión principal",
        body:
          "La señal dominante es **fragmentación + falta de cierre**. Hoy gana quien reduce decisiones pendientes, no quien suma horas.",
        severity: "presion",
      },
      {
        id: `ins-${seed}-opportunity`,
        title: "Actualización: oportunidad inmediata",
        body:
          "Ejecuta un cierre de 20m y agenda un bloque profundo. Eso baja fricción y mejora el puntaje de flujo en 24–48h.",
        severity: "oportunidad",
      },
      {
        id: `ins-${seed}-risk`,
        title: "Actualización: riesgo latente",
        body:
          "Si energía < 65% se mantiene varios días, el rendimiento cae de forma abrupta. Mitiga con recuperación + límite de reuniones.",
        severity: "riesgo",
      },
    ]

    return NextResponse.json({
      success: true,
      data: {
        generatedAt: new Date().toISOString(),
        insights,
      },
    })
  } catch (error: unknown) {
    const detail = error instanceof Error ? error.message : "Error desconocido"
    console.error("ORB_HOME_ANALYSIS ERROR:", detail)
    return NextResponse.json({ success: false, error: "Error generando análisis" }, { status: 500 })
  }
}

