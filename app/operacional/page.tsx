import HomeV3 from "@/app/components/orbita-v3/home/HomeV3"
import HoyV3 from "@/app/components/orbita-v3/home/HoyV3"
import AgendaV3 from "@/app/components/orbita-v3/agenda/AgendaV3"
import HabitosV3 from "@/app/components/orbita-v3/habitos/HabitosV3"

export default function OperacionalPage() {
  return (
    <div className="space-y-16 pb-24">
      <HomeV3 />
      <HoyV3 />
      <AgendaV3 />
      <HabitosV3 />
    </div>
  )
}
