export type ImpactLevel = "alto" | "medio"

export type FlowColor = "green" | "yellow" | "red"

export type OrbitaAlert = {
  id: string
  title: string
  description: string
  impact: ImpactLevel
  oneClickActionLabel: string
}

export type CapitalTime = {
  availableHours: number
  consumedHours: number
  strategicFocusPct: number
}

export type CapitalEnergy = {
  currentLevelPct: number
  trend7d: number[] // 0-100
  burnoutRiskPct: number // 0-100
}

export type CapitalMoney = {
  netMonthlyCOP: number
  runwayDays: number
  financialPressurePct: number // 0-100
}

export type PredictivePoint = {
  day: string // e.g. "09 Abr"
  timeLoad: number // 0-100
  energy: number // 0-100
  moneyPressure: number // 0-100
  flowScore: number // 0-100
}

export type OrbitaInsight = {
  id: string
  title: string
  body: string
  severity: "presion" | "oportunidad" | "riesgo"
}

export type SmartAction = {
  id: string
  title: string
  roi: string
  timeRequiredMin: number
  primaryAction: "Ejecutar" | "Agendar" | "Ignorar"
}

export type CriticalDecision = {
  id: string
  title: string
  deadline: string
  pressure: "alta" | "media"
}

export type DayAgendaBlock = {
  id: string
  time: string
  title: string
  energyWindow: "alta" | "media" | "baja"
}

export type HabitTrend = {
  id: string
  name: string
  week: { day: string; score: number }[] // 0-100
}

export type OrbitaHomeModel = {
  user: {
    firstName: string
    city: string
    tz: string
  }
  flow: {
    score: number
    color: FlowColor
    label: string
    microcopy: string
  }
  alerts: OrbitaAlert[]
  capital: {
    time: CapitalTime
    energy: CapitalEnergy
    money: CapitalMoney
  }
  predictive: {
    points30d: PredictivePoint[]
    insights: OrbitaInsight[]
  }
  smartActions: SmartAction[]
  widgets: {
    decisions: CriticalDecision[]
    agendaToday: DayAgendaBlock[]
    habits: HabitTrend[]
  }
}

