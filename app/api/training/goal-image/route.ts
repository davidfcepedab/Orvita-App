import { readFile } from "fs/promises"
import { join } from "path"
import { NextRequest, NextResponse } from "next/server"
import sharp from "sharp"

export const runtime = "nodejs"

const MAX_PROMPT = 900
const PLACEHOLDER_REL = join("public", "training", "visual-goal-placeholder.png")

function parseDataUrl(dataUrl: string): { mime: string; base64: string } | null {
  const m = /^data:([^;]+);base64,(.+)$/s.exec(dataUrl.trim())
  if (!m) return null
  return { mime: m[1] ?? "application/octet-stream", base64: m[2] ?? "" }
}

/**
 * Edición de imagen con DALL·E 2 (OpenAI images/edits): usa la foto subida o el placeholder
 * y el texto del usuario como prompt.
 */
export async function POST(req: NextRequest) {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) {
    return NextResponse.json({ ok: false, code: "NO_AI_KEY" as const, error: "Falta OPENAI_API_KEY en el servidor." }, { status: 501 })
  }

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ ok: false, error: "JSON inválido" }, { status: 400 })
  }

  const b = body as { prompt?: unknown; imageBase64?: unknown }
  const promptRaw = typeof b.prompt === "string" ? b.prompt.trim() : ""
  if (!promptRaw || promptRaw.length > MAX_PROMPT) {
    return NextResponse.json(
      { ok: false, error: `Escribe un prompt (1–${MAX_PROMPT} caracteres) para guiar la imagen.` },
      { status: 400 },
    )
  }

  let inputBuffer: Buffer
  const img = typeof b.imageBase64 === "string" ? b.imageBase64.trim() : ""

  if (img) {
    const parsed = parseDataUrl(img)
    if (!parsed) {
      return NextResponse.json({ ok: false, error: "Imagen inválida (se espera data URL base64)." }, { status: 400 })
    }
    try {
      inputBuffer = Buffer.from(parsed.base64, "base64")
    } catch {
      return NextResponse.json({ ok: false, error: "No se pudo decodificar la imagen." }, { status: 400 })
    }
    if (inputBuffer.length > 4 * 1024 * 1024) {
      return NextResponse.json({ ok: false, error: "La imagen supera 4 MB." }, { status: 400 })
    }
  } else {
    try {
      const path = join(process.cwd(), PLACEHOLDER_REL)
      inputBuffer = await readFile(path)
    } catch {
      return NextResponse.json({ ok: false, error: "No hay imagen y no se encontró el placeholder." }, { status: 500 })
    }
  }

  let pngSquare: Buffer
  try {
    pngSquare = await sharp(inputBuffer)
      .rotate()
      .resize(1024, 1024, { fit: "cover", position: "attention" })
      .png()
      .toBuffer()
  } catch {
    return NextResponse.json(
      { ok: false, error: "No se pudo procesar la imagen. Prueba con PNG o JPEG." },
      { status: 400 },
    )
  }

  const editPrompt = [
    "Transform this reference into a realistic fitness / physique goal visualization.",
    "Keep it tasteful, athletic, no nudity, no text in the image.",
    "User instructions:",
    promptRaw,
  ].join(" ")

  const form = new FormData()
  /** Solo `dall-e-2` expone `v1/images/edits` con imagen de entrada. */
  form.append("model", "dall-e-2")
  form.append("prompt", editPrompt.slice(0, 1000))
  form.append("n", "1")
  form.append("size", "1024x1024")
  form.append("image", new Blob([new Uint8Array(pngSquare)], { type: "image/png" }), "input.png")

  try {
    const res = await fetch("https://api.openai.com/v1/images/edits", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}` },
      body: form,
    })

    const rawText = await res.text()
    if (!res.ok) {
      let detail = rawText.slice(0, 400)
      try {
        const errJson = JSON.parse(rawText) as { error?: { message?: string } }
        if (errJson.error?.message) detail = errJson.error.message
      } catch {
        /* keep slice */
      }
      return NextResponse.json(
        { ok: false, error: "OpenAI no pudo generar la imagen ahora.", detail },
        { status: res.status >= 400 && res.status < 600 ? res.status : 502 },
      )
    }

    const data = JSON.parse(rawText) as { data?: { b64_json?: string; url?: string }[] }
    const d0 = data.data?.[0]
    let imageDataUrl: string
    if (d0?.b64_json) {
      imageDataUrl = `data:image/png;base64,${d0.b64_json}`
    } else if (d0?.url) {
      const imgRes = await fetch(d0.url)
      if (!imgRes.ok) {
        return NextResponse.json({ ok: false, error: "No se pudo descargar la imagen generada." }, { status: 502 })
      }
      const ab = await imgRes.arrayBuffer()
      imageDataUrl = `data:image/png;base64,${Buffer.from(ab).toString("base64")}`
    } else {
      return NextResponse.json({ ok: false, error: "Respuesta sin imagen." }, { status: 502 })
    }

    return NextResponse.json({ ok: true as const, imageDataUrl })
  } catch {
    return NextResponse.json({ ok: false, error: "Error de red al contactar OpenAI." }, { status: 502 })
  }
}
