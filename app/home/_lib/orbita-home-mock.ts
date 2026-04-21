import type { OrbitaHomeModel, FlowColor, PredictivePoint } from "./orbita-home-types"

function clamp01(n: number) {
  return Math.max(0, Math.min(1, n))
}

function flowColor(score: number): FlowColor {
  if (score >= 75) return "green"
  if (score >= 55) return "yellow"
  return "red"
}

function formatCOP(value: number) {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  }).format(value)
}

function genPredictive30d(): PredictivePoint[] {
  // 30 días con señal coherente: presión financiera sube, energía cae si carga de tiempo sube.
  const base = new Date("2026-04-09T00:00:00-05:00")
  const points: PredictivePoint[] = []
  let timeLoad = 62
  let energy = 64
  let moneyPressure = 58

  for (let i = 0; i < 30; i++) {
    const d = new Date(base)
    d.setDate(base.getDate() + i)

    const weekday = d.toLocaleDateString("es-CO", { weekday: "short", timeZone: "America/Bogota" })
    const day = d.toLocaleDateString("es-CO", { day: "2-digit", month: "short", timeZone: "America/Bogota" })

    // Ajuste por semana: lunes/jueves suelen tener más carga.
    const weekBump = /lun|jue/i.test(weekday) ? 6 : /mar|mié|mie/i.test(weekday) ? 2 : -1
    const noise = (Math.sin(i / 3) + Math.cos(i / 5)) * 1.8

    timeLoad = Math.max(35, Math.min(92, timeLoad + weekBump * 0.35 + noise))
    moneyPressure = Math.max(35, Math.min(92, moneyPressure + 0.65 + (i % 7 === 0 ? 2 : 0) + noise * 0.25))
    energy = Math.max(28, Math.min(90, energy - (timeLoad - 55) * 0.06 - (moneyPressure - 55) * 0.03 + noise * 0.2))

    const flowScore = Math.round(
      100 *
        clamp01(
          0.76 -
            (timeLoad - 50) / 170 -
            (moneyPressure - 50) / 190 +
            (energy - 50) / 240,
        ),
    )

    points.push({
      day: `${day}`,
      timeLoad: Math.round(timeLoad),
      energy: Math.round(energy),
      moneyPressure: Math.round(moneyPressure),
      flowScore,
    })
  }

  return points
}

export function getOrbitaHomeMock(): OrbitaHomeModel & { formatCOP: (n: number) => string } {
  const points30d = genPredictive30d()
  const score = 68

  return {
    formatCOP,
    user: {
      firstName: "David",
      city: "Bogotá",
      tz: "America/Bogota",
    },
    flow: {
      score,
      color: flowColor(score),
      label: "Flujo operativo",
      microcopy: "Vas bien en general, pero conviene vigilar energía y el colchón de efectivo.",
    },
    alerts: [
      {
        id: "a-runway",
        title: "Poca reserva: te quedan unos 18 días",
        description:
          "Si esta semana no ajustas cobros o gastos, te quedas poco margen para decidir con calma.",
        impact: "alto",
        oneClickActionLabel: "Recortar 2 gastos hoy",
      },
      {
        id: "a-energy",
        title: "Energía en amarillo: 4 días seguidos",
        description:
          "Vas al límite sin recuperarte del todo. En 2–3 días puede pegarte más fuerte si no frenas un poco.",
        impact: "alto",
        oneClickActionLabel: "Bloquear 90m de recuperación",
      },
      {
        id: "a-time",
        title: "Poco tiempo para lo estratégico: 22%",
        description:
          "Estás muy metido en lo urgente del día a día. Lo importante a mediano plazo queda de lado.",
        impact: "medio",
        oneClickActionLabel: "Defender un bloque profundo",
      },
      {
        id: "a-decisions",
        title: "Decisión pendiente: propuesta al cliente",
        description:
          "Cada día sin cerrar suma presión y te parte la agenda. Ciérrala hoy o ajusta el alcance.",
        impact: "medio",
        oneClickActionLabel: "Redactar cierre (20 min)",
      },
    ],
    capital: {
      time: {
        availableHours: 9.0,
        consumedHours: 6.4,
        strategicFocusPct: 22,
      },
      energy: {
        currentLevelPct: 61,
        trend7d: [72, 68, 66, 64, 62, 60, 61],
        burnoutRiskPct: 43,
      },
      money: {
        netMonthlyCOP: -1450000,
        runwayDays: 18,
        financialPressurePct: 71,
      },
    },
    predictive: {
      points30d,
      insights: [
        {
          id: "i-pressure",
          title: "Qué te está presionando más esta semana",
          body:
            "Juntar poca reserva de efectivo con una agenda muy partida te cansa la cabeza. No es solo “más trabajo”: son muchas cosas abiertas a la vez.",
          severity: "presion",
        },
        {
          id: "i-impact",
          title: "Una acción con alto impacto para hoy",
          body:
            "Define un recorte mínimo de gastos y haz un cobro pendiente. Eso te da aire y claridad para decidir mejor.",
          severity: "oportunidad",
        },
        {
          id: "i-risk",
          title: "Riesgo a la vista y cómo bajarlo",
          body:
            "Si la energía se queda baja 5 días más, sube mucho el riesgo de agotarte. Ayuda un bloque para recuperarte y menos reuniones por unos días.",
          severity: "riesgo",
        },
      ],
    },
    smartActions: [
      {
        id: "s-cash",
        title: "Activar “modo caja” por 7 días (cobros + recorte mínimo)",
        roi: "Por qué ahora: alto impacto — sumas días de reserva y bajas ruido mental.",
        timeRequiredMin: 25,
        primaryAction: "Ejecutar",
      },
      {
        id: "s-focus",
        title: "Reservar 90 min de trabajo profundo cuando tengas más energía",
        roi: "Por qué ahora: protege lo importante para los próximos 90 días.",
        timeRequiredMin: 5,
        primaryAction: "Agendar",
      },
      {
        id: "s-boundary",
        title: "Replantear un compromiso que no aporta tanto",
        roi: "Por qué ahora: impacto medio — libera tiempo y baja la carga.",
        timeRequiredMin: 15,
        primaryAction: "Ignorar",
      },
    ],
    widgets: {
      decisions: [
        { id: "d-1", title: "Cerrar propuesta cliente (alcance + precio)", deadline: "Hoy 17:00", pressure: "alta" },
        { id: "d-2", title: "Definir recorte mínimo de gastos (7 días)", deadline: "Mañana 12:00", pressure: "media" },
        { id: "d-3", title: "Elegir 1 métrica única de progreso (90D)", deadline: "Sáb 09:00", pressure: "media" },
      ],
      agendaToday: [
        { id: "b-1", time: "08:30–10:00", title: "Trabajo profundo: propuesta", energyWindow: "alta" },
        { id: "b-2", time: "10:30–11:15", title: "Reunión: cliente", energyWindow: "media" },
        { id: "b-3", time: "15:00–15:30", title: "Cierre: cobro pendiente", energyWindow: "media" },
      ],
      habits: [
        {
          id: "h-1",
          name: "Sueño (consistencia)",
          week: [
            { day: "L", score: 78 },
            { day: "M", score: 71 },
            { day: "X", score: 66 },
            { day: "J", score: 62 },
            { day: "V", score: 59 },
            { day: "S", score: 64 },
            { day: "D", score: 67 },
          ],
        },
        {
          id: "h-2",
          name: "Movimiento (mínimo viable)",
          week: [
            { day: "L", score: 55 },
            { day: "M", score: 62 },
            { day: "X", score: 58 },
            { day: "J", score: 45 },
            { day: "V", score: 52 },
            { day: "S", score: 70 },
            { day: "D", score: 63 },
          ],
        },
        {
          id: "h-3",
          name: "Nutrición (señales estables)",
          week: [
            { day: "L", score: 68 },
            { day: "M", score: 64 },
            { day: "X", score: 61 },
            { day: "J", score: 63 },
            { day: "V", score: 60 },
            { day: "S", score: 66 },
            { day: "D", score: 69 },
          ],
        },
      ],
    },
  }
}

