import { NextRequest, NextResponse } from "next/server"

const SYSTEM_DEFAULT = `Eres un asistente de bienestar. Escribe un solo párrafo en español (entre 5 y 8 frases cortas), tono cercano y claro.
Reglas:
- No uses listas, viñetas ni numeraciones.
- No uses palabras técnicas: no digas HRV, API, algoritmo, biométrico, métrica, score, porcentaje como palabra suelta (puedes decir "bastante bien", "justo", "alto", "bajo").
- No inventes diagnósticos ni enfermedades.
- Integra la información de forma natural, como si hablaras con la persona en la cocina.
- Puedes sugerir cosas suaves (agua, descanso, paseo) sin sonar médico.`

const SYSTEM_APPLE_HEVY = `Eres un asistente de bienestar y entrenamiento suave. El usuario vinculó su teléfono (Apple Salud) con Órvita y a veces entrena con Hevy.
Escribe un solo párrafo en español (entre 5 y 8 frases cortas), tono cercano, sin culpa.
Reglas:
- Explica con palabras sencillas si “lo que mide el reloj” y “lo que anotó en el plan de gimnasio” encajan o no, o si falta dato; no asumas motivación.
- No uses listas, viñetas ni numeraciones.
- Evita: HRV, API, algoritmo, biométrico, "score" en inglés, variables, importación, JSON, “health_metrics”. Puedes decir "disposición", "ritmo", "cansancio", "bien".
- Incluye al menos una sugerencia concreta y suave (paseo, ir un poco más fácil, hidratación, acostarse antes) solo si encaja; sin sonar a médico.
- No inventes diagnósticos.`

export async function POST(req: NextRequest) {
  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ ok: false, error: "JSON inválido" }, { status: 400 })
  }

  const b = body as { promptFacts?: unknown; variant?: unknown }
  const promptFacts = typeof b.promptFacts === "string" ? b.promptFacts.trim() : ""
  if (!promptFacts || promptFacts.length > 8000) {
    return NextResponse.json({ ok: false, error: "Faltan datos para el resumen" }, { status: 400 })
  }

  const variant = b.variant === "apple_hevy" ? "apple_hevy" : "default"
  const system = variant === "apple_hevy" ? SYSTEM_APPLE_HEVY : SYSTEM_DEFAULT

  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) {
    return NextResponse.json({ ok: false, code: "NO_AI_KEY" as const }, { status: 501 })
  }

  const userContent = `Hechos sobre la persona (tal como los resume su app; redáctalos de forma natural en tu respuesta, sin copiar viñetas):\n\n${promptFacts}`

  try {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: process.env.OPENAI_HEALTH_SUMMARY_MODEL ?? "gpt-4o-mini",
        messages: [
          { role: "system", content: system },
          { role: "user", content: userContent },
        ],
        max_tokens: 400,
        temperature: 0.65,
      }),
    })

    if (!res.ok) {
      const errText = await res.text().catch(() => "")
      return NextResponse.json(
        { ok: false, error: "No se pudo generar el resumen ahora", detail: errText.slice(0, 200) },
        { status: 502 },
      )
    }

    const data = (await res.json()) as {
      choices?: { message?: { content?: string | null } }[]
    }
    const text = data.choices?.[0]?.message?.content?.trim()
    if (!text) {
      return NextResponse.json({ ok: false, error: "Respuesta vacía" }, { status: 502 })
    }

    return NextResponse.json({ ok: true, summary: text, source: "openai" as const })
  } catch {
    return NextResponse.json({ ok: false, error: "Error de red al generar el resumen" }, { status: 502 })
  }
}
