import { NextRequest, NextResponse } from "next/server"
import { requireUser } from "@/lib/api/requireUser"
import { isAppMockMode } from "@/lib/checkins/flags"
import { extensionForProfileImageMime, validateProfileImage } from "@/lib/media/profileImage"
import { getHouseholdId } from "@/lib/households/getHouseholdId"
import { createServiceClient } from "@/lib/supabase/server"

const BUCKET = "orbita-media"

export async function POST(req: NextRequest) {
  try {
    if (isAppMockMode()) {
      return NextResponse.json({
        success: true,
        data: { familyPhotoUrl: `${req.nextUrl.origin}/icon` },
      })
    }

    if (!process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()) {
      return NextResponse.json(
        {
          success: false,
          error: "Subida de fotos no disponible: falta la clave de servicio en el servidor.",
        },
        { status: 503 },
      )
    }

    const auth = await requireUser(req)
    if (auth instanceof NextResponse) return auth

    const householdId = await getHouseholdId(auth.supabase, auth.userId)
    if (!householdId) {
      return NextResponse.json({ success: false, error: "Usuario sin hogar asignado" }, { status: 403 })
    }

    const form = await req.formData()
    const raw = form.get("file")
    if (!(raw instanceof File)) {
      return NextResponse.json({ success: false, error: "Falta el archivo (campo file)." }, { status: 400 })
    }

    const check = validateProfileImage(raw)
    if (!check.ok) {
      return NextResponse.json({ success: false, error: check.error }, { status: 400 })
    }

    const service = createServiceClient()
    const ext = extensionForProfileImageMime(raw.type)
    const path = `households/${householdId}.${ext}`
    const buffer = Buffer.from(await raw.arrayBuffer())

    const { error: uploadError } = await service.storage.from(BUCKET).upload(path, buffer, {
      contentType: raw.type,
      upsert: true,
    })

    if (uploadError) {
      console.error("household photo upload:", uploadError.message)
      return NextResponse.json(
        { success: false, error: "No se pudo guardar la imagen del hogar." },
        { status: 500 },
      )
    }

    const { data: pub } = service.storage.from(BUCKET).getPublicUrl(path)
    const publicUrl = pub.publicUrl

    const { error: dbError } = await service
      .from("households")
      .update({ family_photo_url: publicUrl })
      .eq("id", householdId)

    if (dbError) {
      console.error("household photo db:", dbError.message)
      return NextResponse.json(
        { success: false, error: "La imagen se subió pero no se pudo guardar en el hogar." },
        { status: 500 },
      )
    }

    return NextResponse.json({ success: true, data: { familyPhotoUrl: publicUrl } })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Error subiendo foto del hogar"
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}
