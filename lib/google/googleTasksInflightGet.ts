import { browserBearerHeaders } from "@/lib/api/browserBearerHeaders"
import type { GoogleTaskDTO } from "@/lib/google/types"

type TasksGetPayload = {
  success?: boolean
  tasks?: GoogleTaskDTO[]
  connected?: boolean
  notice?: string
  error?: string
}

type TasksGetResult = { res: Response; payload: TasksGetPayload }

const inflight = new Map<string, Promise<TasksGetResult>>()

/** Varias instancias de `useGoogleTasks` comparten una petición si la URL coincide. */
export function fetchGoogleTasksGetCoalesced(url: string): Promise<TasksGetResult> {
  const existing = inflight.get(url)
  if (existing) return existing

  const p = (async (): Promise<TasksGetResult> => {
    const fetchTasks = (h: HeadersInit) => fetch(url, { cache: "no-store", headers: h })
    let res = await fetchTasks(await browserBearerHeaders())
    if (res.status === 401) {
      await new Promise((r) => setTimeout(r, 450))
      res = await fetchTasks(await browserBearerHeaders())
    }
    const payload = (await res.json()) as TasksGetPayload
    return { res, payload }
  })().finally(() => {
    inflight.delete(url)
  })

  inflight.set(url, p)
  return p
}
