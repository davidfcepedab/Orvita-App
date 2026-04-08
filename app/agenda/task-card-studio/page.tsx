"use client"

import { TaskCardIterationProvider } from "@/app/agenda/TaskCardIterationContext"
import { TaskCardStudioPanel } from "@/app/agenda/TaskCardStudioPanel"

export default function TaskCardStudioPage() {
  return (
    <TaskCardIterationProvider iterationMode>
      <TaskCardStudioPanel />
    </TaskCardIterationProvider>
  )
}
