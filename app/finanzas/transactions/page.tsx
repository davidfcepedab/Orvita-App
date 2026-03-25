import { Suspense } from "react"
import TransactionsPageClient from "./TransactionsPageClient"

function Loading() {
  return (
    <div className="p-6 text-center text-gray-500">
      <p>Cargando movimientos...</p>
    </div>
  )
}

export default function FinanzasTransactionsPage() {
  return (
    <Suspense fallback={<Loading />}>
      <TransactionsPageClient />
    </Suspense>
  )
}
