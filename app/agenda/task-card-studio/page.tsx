"use client"

import { TaskCardIterationProvider } from "@/app/agenda/TaskCardIterationContext"
import { TaskCardStudioPanel } from "@/app/agenda/TaskCardStudioPanel"

export default function TaskCardStudioPage() {
  return (
    <TaskCardIterationProvider>
      <TaskCardStudioPanel />
    </TaskCardIterationProvider>
  )
}

// === MODO ESTUDIO ACTIVADO =====================================================
// Abre /agenda/task-card-studio (o el botón «Tarjeta maestra» / «Estudio» en la agenda).
// Arrastra filas en «Estructura», ajusta sliders, colores y tipografía.
// Todo se replica en Kanban, Lista, Semana y Mes vía TaskCardDesignProvider (layout /agenda).
// Los cambios se guardan en localStorage (autosave + «Guardar cambios»); «Copiar JSON» para commit.
// ===============================================================================
