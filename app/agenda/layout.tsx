import type { ReactNode } from "react"
import { TaskCardDesignProvider } from "@/app/agenda/TaskCardDesignContext"

export default function AgendaLayout({ children }: { children: ReactNode }) {
  return <TaskCardDesignProvider>{children}</TaskCardDesignProvider>
}
