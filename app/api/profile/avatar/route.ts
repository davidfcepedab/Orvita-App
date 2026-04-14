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
        data: { avatarUrl: `${req.nextUrl.origin}/icon` },
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
    const path = `avatars/${auth.userId}.${ext}`
    const buffer = Buffer.from(await raw.arrayBuffer())

    const { error: uploadError } = await service.storage.from(BUCKET).upload(path, buffer, {
      contentType: raw.type,
      upsert: true,
    })

    if (uploadError) {
      console.error("profile avatar upload:", uploadError.message)
      return NextResponse.json(
        { success: false, error: "No se pudo guardar la imagen. Revisa el bucket de almacenamiento." },
        { status: 500 },
      )
    }

    const { data: pub } = service.storage.from(BUCKET).getPublicUrl(path)
    const publicUrl = pub.publicUrl

    const { data: updated, error: updateError } = await service
      .from("users")
      .update({ avatar_url: publicUrl })
      .eq("id", auth.userId)
      .select("id")
      .maybeSingle()

    if (updateError) {
      console.error("profile avatar db update:", updateError.message)
      return NextResponse.json(
        { success: false, error: "La imagen se subió pero no se pudo enlazar a tu cuenta." },
        { status: 500 },
      )
    }

    if (!updated) {
      const householdId = await getHouseholdId(auth.supabase, auth.userId)
      if (!householdId) {
        return NextResponse.json(
          { success: false, error: "No hay fila de usuario en la base de datos y falta hogar asignado." },
          { status: 409 },
        )
      }
      const { data: authUser } = await service.auth.admin.getUserById(auth.userId)
      const email = authUser?.user?.email?.trim() ?? null
      const { error: insertError } = await service.from("users").insert({
        id: auth.userId,
        household_id: householdId,
        email,
        avatar_url: publicUrl,
      })
      if (insertError) {
        console.error("profile avatar db insert:", insertError.message)
        return NextResponse.json(
          { success: false, error: "La imagen se subió pero no se pudo crear tu perfil en base de datos." },
          { status: 500 },
        )
      }
    }

    return NextResponse.json({ success: true, data: { avatarUrl: publicUrl } })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Error subiendo avatar"
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}
