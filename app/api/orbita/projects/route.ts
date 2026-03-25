import { NextRequest, NextResponse } from "next/server"
import { isAppProfileId, resolveDefaultProfileId, type AppProfileId } from "@/lib/config/profiles"
import { listOrvitaProjects } from "@/lib/orbita/repositories/projectsRepo"

function resolveProfileId(req: NextRequest): AppProfileId {
  const param = req.nextUrl.searchParams.get("profileId")
  return isAppProfileId(param) ? param : resolveDefaultProfileId()
}

export async function GET(req: NextRequest) {
  try {
    const profileId = resolveProfileId(req)
    const result = await listOrvitaProjects({ profileId })
    return NextResponse.json({ success: true, profileId, source: result.source, data: result.data })
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: "Error cargando proyectos", detail: error?.message ?? "unknown_error" },
      { status: 500 }
    )
  }
}

