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

/** PNG de 1024² en base64 supera con facilidad el cupo de localStorage y límites de cuerpo HTTP; WebP reduce tamaño y evita que el guardado falle en silencio. */
async function encodeGeneratedPngAsWebpDataUrl(pngBuffer: Buffer): Promise<string> {
  const webp = await sharp(pngBuffer)
    .rotate()
    .resize(1200, 1200, { fit: "inside", withoutEnlargement: true })
    .webp({ quality: 82 })
    .toBuffer()
  return `data:image/webp;base64,${webp.toString("base64")}`
}

function jsonFromOpenAIError(rawText: string): { detail: string; isSafety: boolean } {
  let detail = rawText.slice(0, 400)
  try {
    const errJson = JSON.parse(rawText) as { error?: { message?: string } }
    if (errJson.error?.message) detail = errJson.error.message
  } catch {
    /* keep slice */
  }
  const d = detail.toLowerCase()
  const isSafety =
    d.includes("safety system") ||
    d.includes("content policy") ||
    d.includes("moderation") ||
    d.includes("safety_violations")
  return { detail, isSafety }
}

type ParsedBody = {
  prompt: string
  mode: "create" | "edit"
  imageBase64: string | undefined
}

function parseBody(body: unknown): ParsedBody | NextResponse {
  const b = body as { prompt?: unknown; mode?: unknown; imageBase64?: unknown }
  const promptRaw = typeof b.prompt === "string" ? b.prompt.trim() : ""
  if (!promptRaw || promptRaw.length > MAX_PROMPT) {
    return NextResponse.json(
      { ok: false, error: `Escribe un prompt (1–${MAX_PROMPT} caracteres) para guiar la imagen.` },
      { status: 400 },
    )
  }
  const mode = b.mode === "edit" ? ("edit" as const) : ("create" as const)
  const img = typeof b.imageBase64 === "string" ? b.imageBase64.trim() : undefined
  return { prompt: promptRaw, mode, imageBase64: img || undefined }
}

/**
 * `create`: DALL·E 3 por texto — cambios visuales fuertes (images/generations).
 * `edit`: DALL·E 2 sobre PNG — suele parecerse mucho a la entrada (images/edits).
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

  const parsed = parseBody(body)
  if (parsed instanceof NextResponse) return parsed
  const { prompt: promptRaw, mode, imageBase64: img } = parsed

  try {
    let pngOut: Buffer

    if (mode === "create") {
      const genPrompt = [
        "Tasteful fitness motivation hero artwork for a training app.",
        "Bold, clearly distinct scene; may be illustrated, painterly, or stylized 3D — not a subtle tweak of a photo.",
        "Subject in full athletic clothing; dynamic energy; no nudity; no text, logos, or watermarks; no identifiable real person.",
        "User creative direction (any language):",
        promptRaw,
      ].join(" ")

      const res = await fetch("https://api.openai.com/v1/images/generations", {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "dall-e-3",
          prompt: genPrompt.slice(0, 4000),
          n: 1,
          size: "1024x1024",
          quality: "standard",
          response_format: "b64_json",
        }),
      })

      const rawText = await res.text()
      if (!res.ok) {
        const { detail, isSafety } = jsonFromOpenAIError(rawText)
        if (isSafety) {
          return NextResponse.json(
            {
              ok: false,
              code: "CONTENT_POLICY" as const,
              error:
                "La generación fue rechazada por el filtro de seguridad del proveedor de IA (puede deberse a la foto, al prompt o a la combinación).",
              detail,
            },
            { status: 422 },
          )
        }
        return NextResponse.json(
          { ok: false, error: "OpenAI no pudo generar la imagen ahora.", detail },
          { status: res.status >= 400 && res.status < 600 ? res.status : 502 },
        )
      }

      const data = JSON.parse(rawText) as { data?: { b64_json?: string; url?: string }[] }
      const d0 = data.data?.[0]
      if (d0?.b64_json) {
        pngOut = Buffer.from(d0.b64_json, "base64")
      } else if (d0?.url) {
        const imgRes = await fetch(d0.url)
        if (!imgRes.ok) {
          return NextResponse.json({ ok: false, error: "No se pudo descargar la imagen generada." }, { status: 502 })
        }
        pngOut = Buffer.from(await imgRes.arrayBuffer())
      } else {
        return NextResponse.json({ ok: false, error: "Respuesta sin imagen." }, { status: 502 })
      }
    } else {
      let inputBuffer: Buffer
      if (img) {
        const parsedUrl = parseDataUrl(img)
        if (!parsedUrl) {
          return NextResponse.json({ ok: false, error: "Imagen inválida (se espera data URL base64)." }, { status: 400 })
        }
        try {
          inputBuffer = Buffer.from(parsedUrl.base64, "base64")
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
        /** OpenAI images/edits exige PNG con alpha (RGBA), no RGB plano. */
        pngSquare = await sharp(inputBuffer)
          .rotate()
          .resize(1024, 1024, { fit: "cover", position: "attention" })
          .ensureAlpha()
          .png()
          .toBuffer()
      } catch {
        return NextResponse.json(
          { ok: false, error: "No se pudo procesar la imagen. Prueba con PNG o JPEG." },
          { status: 400 },
        )
      }

      const editPrompt = [
        "Create a tasteful fitness-motivation style image, using the reference only for loose composition and mood.",
        "Stylized athletic training look; full athletic clothing; no nudity; no text or watermarks in the image.",
        "Not a photographic likeness of any real person.",
        "User creative direction:",
        promptRaw,
      ].join(" ")

      const form = new FormData()
      form.append("model", "dall-e-2")
      form.append("prompt", editPrompt.slice(0, 1000))
      form.append("n", "1")
      form.append("size", "1024x1024")
      form.append("image", new Blob([new Uint8Array(pngSquare)], { type: "image/png" }), "input.png")

      const res = await fetch("https://api.openai.com/v1/images/edits", {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}` },
        body: form,
      })

      const rawText = await res.text()
      if (!res.ok) {
        const { detail, isSafety } = jsonFromOpenAIError(rawText)
        if (isSafety) {
          return NextResponse.json(
            {
              ok: false,
              code: "CONTENT_POLICY" as const,
              error:
                "La generación fue rechazada por el filtro de seguridad del proveedor de IA (puede deberse a la foto, al prompt o a la combinación).",
              detail,
            },
            { status: 422 },
          )
        }
        return NextResponse.json(
          { ok: false, error: "OpenAI no pudo generar la imagen ahora.", detail },
          { status: res.status >= 400 && res.status < 600 ? res.status : 502 },
        )
      }

      const data = JSON.parse(rawText) as { data?: { b64_json?: string; url?: string }[] }
      const d0 = data.data?.[0]
      if (d0?.b64_json) {
        pngOut = Buffer.from(d0.b64_json, "base64")
      } else if (d0?.url) {
        const imgRes = await fetch(d0.url)
        if (!imgRes.ok) {
          return NextResponse.json({ ok: false, error: "No se pudo descargar la imagen generada." }, { status: 502 })
        }
        pngOut = Buffer.from(await imgRes.arrayBuffer())
      } else {
        return NextResponse.json({ ok: false, error: "Respuesta sin imagen." }, { status: 502 })
      }
    }

    let imageDataUrl: string
    try {
      imageDataUrl = await encodeGeneratedPngAsWebpDataUrl(pngOut)
    } catch {
      return NextResponse.json({ ok: false, error: "No se pudo preparar la imagen generada." }, { status: 500 })
    }

    return NextResponse.json({ ok: true as const, imageDataUrl, mode })
  } catch {
    return NextResponse.json({ ok: false, error: "Error de red al contactar OpenAI." }, { status: 502 })
  }
}
