// lib/engines/personalScoringEngine.ts

type CheckInInput = {
  energia: number           // 1–10
  entreno: number           // 0 o 1
  horas_sueno: number       // horas reales
  calidad_sueno: number     // 1–5
  deep_work: number         // horas
  cumplimiento_foco: number // 0 o 1
  distraccion: number       // 1–5
  estres: number            // 1–5
}

function normalize(value: number, min: number, max: number) {
  return Math.max(0, Math.min(100, ((value - min) / (max - min)) * 100))
}

function normalizeInverse(value: number, min: number, max: number) {
  return 100 - normalize(value, min, max)
}

/* ===============================
   SCORE FÍSICO
================================ */

function calculatePhysical(input: CheckInInput) {

  const energia = normalize(input.energia, 1, 10)

  const suenoIdeal = normalize(input.horas_sueno, 5, 8)
  const calidadSueno = normalize(input.calidad_sueno, 1, 5)

  const entreno = input.entreno ? 100 : 40

  const score =
    energia * 0.4 +
    suenoIdeal * 0.3 +
    calidadSueno * 0.2 +
    entreno * 0.1

  return Math.round(score)
}

/* ===============================
   SCORE PROFESIONAL
================================ */

function calculateProfessional(input: CheckInInput) {

  const deepWork = normalize(input.deep_work, 0, 5)
  const cumplimiento = input.cumplimiento_foco ? 100 : 50
  const distraccion = normalizeInverse(input.distraccion, 1, 5)

  const score =
    deepWork * 0.4 +
    cumplimiento * 0.3 +
    distraccion * 0.3

  return Math.round(score)
}

/* ===============================
   SCORE RECUPERACIÓN
================================ */

function calculateRecovery(input: CheckInInput) {

  const sueno = normalize(input.horas_sueno, 5, 8)
  const estres = normalizeInverse(input.estres, 1, 5)
  const energia = normalize(input.energia, 1, 10)

  const score =
    sueno * 0.4 +
    estres * 0.3 +
    energia * 0.3

  return Math.round(score)
}

/* ===============================
   SCORE GLOBAL
================================ */

function calculateGlobal(
  fisico: number,
  profesional: number,
  recuperacion: number
) {
  const score =
    fisico * 0.35 +
    profesional * 0.35 +
    recuperacion * 0.30

  return Math.round(score)
}

/* ===============================
   EXPORT PRINCIPAL
================================ */

export function scoringEngine(input: CheckInInput) {

  const score_fisico = calculatePhysical(input)
  const score_profesional = calculateProfessional(input)
  const score_recuperacion = calculateRecovery(input)

  const global_score = calculateGlobal(
    score_fisico,
    score_profesional,
    score_recuperacion
  )

  return {
    score_fisico,
    score_profesional,
    score_recuperacion,
    global_score
  }
}
