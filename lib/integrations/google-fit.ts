import { refreshAccessTokenIfNeeded, type GoogleIntegrationRecord } from "@/lib/integrations/google"

export const GOOGLE_FIT_SCOPES = [
  "https://www.googleapis.com/auth/fitness.sleep.read",
  "https://www.googleapis.com/auth/fitness.heart_rate.read",
  "https://www.googleapis.com/auth/fitness.activity.read",
] as const

type GoogleAggregateBucketDatasetPoint = {
  dataTypeName?: string
  value?: Array<{ intVal?: number; fpVal?: number }>
}

type GoogleAggregateBucket = {
  startTimeMillis?: string
  endTimeMillis?: string
  dataset?: GoogleAggregateBucketDatasetPoint[]
}

type GoogleAggregateResponse = {
  bucket?: GoogleAggregateBucket[]
}

type FitSummary = {
  observedAt: string
  sleepHours: number | null
  hrvMs: number | null
  readinessScore: number | null
  steps: number | null
  calories: number | null
  source: "google_fit"
}

function parseBuckets(payload: GoogleAggregateResponse) {
  const buckets = payload.bucket ?? []
  let sleepMillis = 0
  let steps = 0
  let calories = 0
  let avgHr = 0
  let hrPoints = 0

  for (const bucket of buckets) {
    for (const ds of bucket.dataset ?? []) {
      const key = ds.dataTypeName ?? ""
      for (const value of ds.value ?? []) {
        if (key.includes("com.google.sleep.segment")) {
          sleepMillis += Number(value.intVal ?? value.fpVal ?? 0)
        } else if (key.includes("com.google.step_count.delta")) {
          steps += Number(value.intVal ?? value.fpVal ?? 0)
        } else if (key.includes("com.google.calories.expended")) {
          calories += Number(value.fpVal ?? value.intVal ?? 0)
        } else if (key.includes("com.google.heart_rate.bpm")) {
          avgHr += Number(value.fpVal ?? value.intVal ?? 0)
          hrPoints += 1
        }
      }
    }
  }

  const sleepHours = sleepMillis > 0 ? Math.round((sleepMillis / 3_600_000) * 100) / 100 : null
  const avgHeartRate = hrPoints > 0 ? avgHr / hrPoints : null
  const hrvMs = avgHeartRate ? Math.max(15, Math.round(120 - avgHeartRate)) : null
  const readinessScore = Math.max(
    35,
    Math.min(
      98,
      Math.round((sleepHours ? sleepHours * 9 : 55) + (steps > 6000 ? 10 : 0) + (avgHeartRate && avgHeartRate < 72 ? 8 : 0)),
    ),
  )

  return {
    sleepHours,
    hrvMs,
    readinessScore: Number.isFinite(readinessScore) ? readinessScore : null,
    steps: steps > 0 ? Math.round(steps) : null,
    calories: calories > 0 ? Math.round(calories) : null,
  }
}

async function callGoogleAggregate(accessToken: string): Promise<GoogleAggregateResponse> {
  const now = Date.now()
  const start = now - 24 * 60 * 60 * 1000
  const body = {
    aggregateBy: [
      { dataTypeName: "com.google.sleep.segment" },
      { dataTypeName: "com.google.step_count.delta" },
      { dataTypeName: "com.google.calories.expended" },
      { dataTypeName: "com.google.heart_rate.bpm" },
    ],
    bucketByTime: { durationMillis: 24 * 60 * 60 * 1000 },
    startTimeMillis: start,
    endTimeMillis: now,
  }

  const res = await fetch("https://www.googleapis.com/fitness/v1/users/me/dataset:aggregate", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const detail = await res.text()
    throw new Error(`Google Fit aggregate failed (${res.status}): ${detail.slice(0, 400)}`)
  }
  return (await res.json()) as GoogleAggregateResponse
}

export async function fetchGoogleFitDailySummary(integration: GoogleIntegrationRecord): Promise<FitSummary> {
  const token = await refreshAccessTokenIfNeeded(integration)
  const aggregate = await callGoogleAggregate(token)
  const parsed = parseBuckets(aggregate)
  return {
    observedAt: new Date().toISOString(),
    sleepHours: parsed.sleepHours,
    hrvMs: parsed.hrvMs,
    readinessScore: parsed.readinessScore,
    steps: parsed.steps,
    calories: parsed.calories,
    source: "google_fit",
  }
}
