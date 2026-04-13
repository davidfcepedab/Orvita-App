import { addCalendarDaysYmd } from "@/lib/agenda/calendarMath"
import { agendaTodayYmd } from "@/lib/agenda/localDateKey"

/** Suma días a una fecha civil YYYY-MM-DD (misma lógica que hábitos). */
export function addDaysToYmd(ymd: string, deltaDays: number): string {
  if (!ymd || ymd.length < 10) return agendaTodayYmd()
  return addCalendarDaysYmd(ymd, deltaDays)
}

export function isYmdTodayLocal(ymd: string): boolean {
  if (!ymd || ymd.length < 10) return false
  return ymd.slice(0, 10) === agendaTodayYmd()
}
