"use client"

import { Check, Pencil, Plus, Save, Trash2, Zap } from "lucide-react"
import type { HealthSupplement, SupplementMomentId } from "@/lib/health/healthPrefsTypes"
import { SUPPLEMENT_DAYPART_LABELS, SUPPLEMENT_DAYPART_ORDER } from "@/lib/health/supplementDayparts"
import { Card } from "@/src/components/ui/Card"
import { cn } from "@/lib/utils"

type Props = {
  supplements: HealthSupplement[]
  activeCount: number
  suppLoading: boolean
  suppError: string | null
  editMode: boolean
  setEditMode: (v: boolean) => void
  updateSupplement: (
    id: string,
    patch: Partial<Pick<HealthSupplement, "name" | "amount" | "daypart" | "indispensable" | "active">>,
  ) => void
  addSupplement: () => void
  removeSupplement: (id: string) => void
  takenToday: (id: string) => boolean
  toggleComplianceToday: (id: string) => void
}

function ProtocolCard({
  item,
  taken,
  onToggleTaken,
}: {
  item: HealthSupplement
  taken: boolean
  onToggleTaken: () => void
}) {
  const critical = item.indispensable
  const vitalVisual = critical && !taken

  return (
    <button
      type="button"
      onClick={onToggleTaken}
      className={cn(
        "relative flex w-full min-w-0 items-stretch gap-3 rounded-[14px] border px-3 py-3 text-left shadow-sm transition-[background,border-color,opacity]",
        taken && "opacity-55",
        vitalVisual && "animate-pulse border-red-500/55 bg-red-500/[0.07]",
        !vitalVisual && !taken && "border-[var(--color-border)] bg-[var(--color-surface-alt)]",
        taken && "border-[var(--color-border)] bg-[var(--color-surface)]",
      )}
    >
      <span className="shrink-0 pt-0.5">
        {taken ? (
          <span
            className="flex h-9 w-9 items-center justify-center rounded-lg bg-[var(--color-accent-health)] text-white"
            aria-hidden
          >
            <Check className="h-4 w-4" strokeWidth={2.75} />
          </span>
        ) : (
          <span
            className={cn(
              "flex h-9 w-9 items-center justify-center rounded-full border-2",
              vitalVisual ? "border-red-500 bg-orbita-surface" : "border-[var(--color-border)] bg-[var(--color-surface)]",
            )}
            aria-hidden
          >
            {vitalVisual ? <span className="h-2 w-2 rounded-full bg-red-500" /> : null}
          </span>
        )}
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p
            className={cn(
              "m-0 text-[13px] font-semibold leading-snug text-[var(--color-text-primary)]",
              taken && "line-through decoration-[var(--color-text-secondary)]",
            )}
          >
            {item.name}
          </p>
          {critical && !taken ? (
            <span className="rounded-full border border-red-500/45 bg-red-500/[0.12] px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.1em] text-red-600">
              Vital
            </span>
          ) : null}
        </div>
        <p className="m-0 mt-1 text-[11px] font-medium uppercase tracking-[0.06em] text-[var(--color-text-secondary)]">
          {item.amount}
        </p>
      </div>
      {vitalVisual ? (
        <span className="w-1 shrink-0 self-stretch rounded-l-sm bg-red-500" aria-hidden />
      ) : (
        <span className="w-1 shrink-0 self-stretch opacity-0" aria-hidden />
      )}
    </button>
  )
}

export function SupplementStackSection({
  supplements,
  activeCount,
  suppLoading,
  suppError,
  editMode,
  setEditMode,
  updateSupplement,
  addSupplement,
  removeSupplement,
  takenToday,
  toggleComplianceToday,
}: Props) {
  const actives = supplements.filter((s) => s.active)
  const takenAmongActive = actives.filter((s) => takenToday(s.id)).length

  const byMoment = SUPPLEMENT_DAYPART_ORDER.map((moment) => ({
    moment,
    items: actives.filter((s) => s.daypart === moment),
  })).filter((g) => g.items.length > 0)

  return (
    <Card>
      <div className="grid gap-[var(--spacing-md)] p-[var(--spacing-md)]">
        <div className="flex flex-wrap items-start justify-between gap-3 border-b border-[var(--color-border)] pb-4">
          <div className="flex min-w-0 flex-1 gap-3">
            <span
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--color-accent-health)]/15 text-[var(--color-accent-health)]"
              aria-hidden
            >
              <Zap className="h-5 w-5" strokeWidth={2.25} />
            </span>
            <div className="min-w-0">
              <p className="m-0 text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--color-text-secondary)]">
                Bio-stack
              </p>
              <p className="m-0 mt-1 text-[17px] font-semibold leading-tight text-[var(--color-text-primary)]">
                Protocolos del día ({takenAmongActive}/{activeCount})
              </p>
              <p className="m-0 mt-1 text-[12px] text-[var(--color-text-secondary)]">
                {activeCount}/{supplements.length} protocolos activos en biblioteca
                {suppLoading ? " · guardando…" : ""}
              </p>
              {suppError ? (
                <p className="m-0 mt-1 text-[11px] text-[var(--color-accent-danger)]">{suppError}</p>
              ) : null}
            </div>
          </div>
          <button
            type="button"
            onClick={() => setEditMode(!editMode)}
            className={cn(
              "inline-flex shrink-0 items-center gap-2 rounded-[10px] border px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.14em] transition-colors",
              editMode
                ? "border-[var(--color-accent-health)] bg-transparent text-[var(--color-accent-health)]"
                : "border-[var(--color-border)] bg-[var(--color-surface-alt)] text-[var(--color-text-secondary)]",
            )}
          >
            {editMode ? (
              <>
                <Save className="h-3.5 w-3.5" strokeWidth={2.25} />
                Guardar
              </>
            ) : (
              <>
                <Pencil className="h-3.5 w-3.5" strokeWidth={2.25} />
                Editar
              </>
            )}
          </button>
        </div>

        {editMode ? (
          <div className="grid gap-3">
            <div className="md:hidden">
              <div className="grid gap-3">
                {supplements.map((row) => (
                  <div
                    key={row.id}
                    className="grid gap-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-alt)]/40 p-3"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex flex-wrap gap-3 text-[11px] text-[var(--color-text-secondary)]">
                      <label className="inline-flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={row.active}
                          onChange={() => updateSupplement(row.id, { active: !row.active })}
                        />
                        En stack
                      </label>
                      <label className="inline-flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={row.indispensable}
                          onChange={() => updateSupplement(row.id, { indispensable: !row.indispensable })}
                        />
                        Vital
                      </label>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeSupplement(row.id)}
                        className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-[var(--color-text-secondary)] opacity-60 transition hover:bg-[color-mix(in_srgb,var(--color-accent-danger)_12%,transparent)] hover:text-[var(--color-accent-danger)] hover:opacity-100"
                        aria-label={`Eliminar fila: ${row.name}`}
                        title="Eliminar fila"
                      >
                        <Trash2 className="h-3.5 w-3.5" strokeWidth={2} aria-hidden />
                      </button>
                    </div>
                    <input
                      value={row.name}
                      onChange={(e) => updateSupplement(row.id, { name: e.target.value })}
                      className="w-full rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-2 py-1.5 text-[12px]"
                      placeholder="Nombre"
                    />
                    <input
                      value={row.amount}
                      onChange={(e) => updateSupplement(row.id, { amount: e.target.value })}
                      className="w-full rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-2 py-1.5 text-[12px]"
                      placeholder="Dosis"
                    />
                    <select
                      value={row.daypart}
                      onChange={(e) => updateSupplement(row.id, { daypart: e.target.value as SupplementMomentId })}
                      className="w-full rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-2 py-1.5 text-[12px]"
                    >
                      {SUPPLEMENT_DAYPART_ORDER.map((dp) => (
                        <option key={dp} value={dp}>
                          {SUPPLEMENT_DAYPART_LABELS[dp]}
                        </option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>
            </div>

            <div className="hidden md:block">
              <div className="w-full min-w-0 overflow-x-auto rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-alt)]/50">
                <table className="w-full min-w-[700px] border-collapse text-left text-[12px]">
                  <thead>
                    <tr className="border-b border-[var(--color-border)] text-[10px] uppercase tracking-[0.12em] text-[var(--color-text-secondary)]">
                      <th className="px-2 py-2 font-semibold">En stack</th>
                      <th className="px-2 py-2 font-semibold">Vital</th>
                      <th className="px-2 py-2 font-semibold">Nombre</th>
                      <th className="px-2 py-2 font-semibold">Dosis</th>
                      <th className="px-2 py-2 font-semibold">Momento</th>
                      <th className="w-10 px-1 py-2 font-semibold">
                        <span className="sr-only">Eliminar</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {supplements.map((row) => (
                      <tr key={row.id} className="border-b border-[var(--color-border)]/70 last:border-b-0">
                        <td className="px-2 py-2 align-middle">
                          <input
                            type="checkbox"
                            checked={row.active}
                            onChange={() => updateSupplement(row.id, { active: !row.active })}
                            aria-label={`Activo en stack: ${row.name}`}
                          />
                        </td>
                        <td className="px-2 py-2 align-middle">
                          <input
                            type="checkbox"
                            checked={row.indispensable}
                            onChange={() => updateSupplement(row.id, { indispensable: !row.indispensable })}
                            aria-label={`Vital: ${row.name}`}
                          />
                        </td>
                        <td className="px-2 py-2 align-middle">
                          <input
                            value={row.name}
                            onChange={(e) => updateSupplement(row.id, { name: e.target.value })}
                            className="w-full min-w-[140px] rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-2 py-1.5 text-[12px]"
                          />
                        </td>
                        <td className="px-2 py-2 align-middle">
                          <input
                            value={row.amount}
                            onChange={(e) => updateSupplement(row.id, { amount: e.target.value })}
                            className="w-full min-w-[88px] rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-2 py-1.5 text-[12px]"
                          />
                        </td>
                        <td className="px-2 py-2 align-middle">
                          <select
                            value={row.daypart}
                            onChange={(e) =>
                              updateSupplement(row.id, { daypart: e.target.value as SupplementMomentId })
                            }
                            className="w-full min-w-[160px] rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-2 py-1.5 text-[12px]"
                          >
                            {SUPPLEMENT_DAYPART_ORDER.map((dp) => (
                              <option key={dp} value={dp}>
                                {SUPPLEMENT_DAYPART_LABELS[dp]}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="px-1 py-2 align-middle">
                          <button
                            type="button"
                            onClick={() => removeSupplement(row.id)}
                            className="inline-flex h-8 w-8 items-center justify-center rounded-md text-[var(--color-text-secondary)] opacity-55 transition hover:bg-[color-mix(in_srgb,var(--color-accent-danger)_12%,transparent)] hover:text-[var(--color-accent-danger)] hover:opacity-100"
                            aria-label={`Eliminar fila: ${row.name}`}
                            title="Eliminar fila"
                          >
                            <Trash2 className="h-3.5 w-3.5" strokeWidth={2} aria-hidden />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <button
              type="button"
              onClick={addSupplement}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-[var(--color-border)] bg-[var(--color-surface-alt)]/30 py-3 text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--color-text-secondary)] transition hover:border-[var(--color-accent-health)] hover:bg-[color-mix(in_srgb,var(--color-accent-health)_8%,var(--color-surface-alt))] hover:text-[var(--color-accent-health)] md:w-auto md:self-start md:px-6"
            >
              <Plus className="h-4 w-4" strokeWidth={2.25} aria-hidden />
              Añadir protocolo
            </button>

            <p className="text-[10px] leading-snug text-[var(--color-text-secondary)]">
              Usa <span className="font-semibold">Añadir protocolo</span> para nuevas filas; el icono de papelera elimina
              una entrada (si borras todas, se restauran los protocolos por defecto). En lectura, pulsa cada tarjeta para
              marcar si ya lo tomaste hoy. Sincronización con tu perfil si Supabase está activo.
            </p>
          </div>
        ) : actives.length === 0 ? (
          <p className="m-0 text-[13px] text-[var(--color-text-secondary)]">
            No hay protocolos activos. Pulsa <span className="font-semibold">Editar</span> para activar entradas de tu
            biblioteca.
          </p>
        ) : (
          <div className="grid gap-[var(--spacing-lg)]">
            {byMoment.map(({ moment, items }) => (
              <div key={moment}>
                <p className="m-0 mb-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--color-text-secondary)]">
                  {SUPPLEMENT_DAYPART_LABELS[moment]}
                </p>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {items.map((item) => (
                    <ProtocolCard
                      key={item.id}
                      item={item}
                      taken={takenToday(item.id)}
                      onToggleTaken={() => toggleComplianceToday(item.id)}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Card>
  )
}
