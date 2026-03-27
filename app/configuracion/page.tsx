import { Suspense } from "react"
import ConfigV3 from "@/app/components/orbita-v3/config/ConfigV3"

export default function ConfiguracionPage() {
  return (
    <Suspense fallback={null}>
      <ConfigV3 />
    </Suspense>
  )
}
