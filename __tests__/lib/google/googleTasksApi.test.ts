import { fetchDefaultTaskList, mapGoogleTask, normalizeGoogleTaskDueToIso } from "@/lib/google/googleTasksApi"
import { agendaTodayYmd, localDateKeyFromIso } from "@/lib/agenda/localDateKey"

describe("normalizeGoogleTaskDueToIso", () => {
  it("acepta fecha solo YYYY-MM-DD", () => {
    expect(normalizeGoogleTaskDueToIso("2026-04-07")).toBe("2026-04-07T00:00:00.000Z")
  })

  it("devuelve null si no es parseable", () => {
    expect(normalizeGoogleTaskDueToIso("")).toBeNull()
    expect(normalizeGoogleTaskDueToIso("no-es-fecha")).toBeNull()
  })
})

describe("mapGoogleTask", () => {
  it("alinea día civil con localDateKeyFromIso para medianoche UTC", () => {
    const m = mapGoogleTask({
      id: "x",
      title: "T",
      status: "needsAction",
      due: "2026-04-07T00:00:00.000Z",
    })
    expect(m?.due).toBe("2026-04-07T00:00:00.000Z")
    expect(localDateKeyFromIso(m?.due ?? null)).toBe("2026-04-07")
  })
})

describe("fetchDefaultTaskList", () => {
  const originalFetch = global.fetch

  afterEach(() => {
    global.fetch = originalFetch
    jest.resetAllMocks()
  })

  it("sigue nextPageToken hasta agotar páginas", async () => {
    global.fetch = jest
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        text: async () => "",
        json: async () => ({
          items: [{ id: "a", title: "A", status: "needsAction" }],
          nextPageToken: "tok1",
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        text: async () => "",
        json: async () => ({
          items: [{ id: "b", title: "B", status: "needsAction" }],
        }),
      })

    const tasks = await fetchDefaultTaskList("access-token", false)
    expect(tasks.map((t) => t.id)).toEqual(["a", "b"])
    expect(global.fetch).toHaveBeenCalledTimes(2)
    const secondUrl = (global.fetch as jest.Mock).mock.calls[1][0] as string
    expect(secondUrl).toContain("pageToken=tok1")
  })
})

describe("filtro hoy (integración ligera)", () => {
  it("coincide prefijo YYYY-MM-DD con hoy en agenda", () => {
    const today = agendaTodayYmd()
    const key = localDateKeyFromIso(`${today}T12:00:00.000Z`)
    expect(key).toBe(today)
  })
})
