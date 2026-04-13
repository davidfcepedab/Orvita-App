import HomeV3 from "@/app/components/orbita-v3/home/HomeV3"
import HoyV3 from "@/app/components/orbita-v3/home/HoyV3"
import AgendaV3 from "@/app/components/orbita-v3/agenda/AgendaV3"
import HabitosV3 from "@/app/components/orbita-v3/habitos/HabitosV3"

/**
 * Vista “día / ritmo”: HomeV3, Hoy, agenda y hábitos.
 * Ruta canónica acordada: `/inicio` (no usar `/operacional` en enlaces nuevos).
 */
export default function InicioPage() {
  return (
    <div className="mx-auto min-w-0 max-w-6xl space-y-10 overflow-x-hidden px-4 pb-24 pt-4 phone:space-y-12">
      <HomeV3 />
      <HoyV3 />
      <AgendaV3 />
      <HabitosV3 />
    </div>
  )
}
