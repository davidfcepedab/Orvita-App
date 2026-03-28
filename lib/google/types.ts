export type GoogleCalendarEventDTO = {
  id: string
  summary: string
  startAt: string | null
  endAt: string | null
  allDay: boolean
}

export type GoogleTaskDTO = {
  id: string
  title: string
  status: string | null
  due: string | null
}
