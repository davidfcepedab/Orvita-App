"use client"

import type { HealthSupplement, SupplementDaypart } from "@/lib/health/healthPrefsTypes"
import { SUPPLEMENT_DAYPART_LABELS, SUPPLEMENT_DAYPART_ORDER } from "@/lib/health/supplementDayparts"
import { Card } from "@/src/components/ui/Card"

type Props = {
  supplements: HealthSupplement[]
  activeCount: number
  suppLoading: boolean
  suppError: string | null
  editMode: boolean
  setEditMode: (v: boolean) => void
  toggleActive: (id: string) => void
  updateSupplement: (
    id: string,
    patch: Partial<Pick<HealthSupplement, "name" | "amount" | "daypart" | "indispensable" | "active">>,
  ) => void
  takenToday: (id: string) => boolean
  toggleComplianceToday: (id: string) => void
}

function SupplementColumn({
  item,
  editMode,
  toggleActive,
  updateSupplement,
  takenToday,
  toggleComplianceToday,
}: {
  item: HealthSupplement
  editMode: boolean
  toggleActive: (id: string) => void
  updateSupplement: Props["updateSupplement"]
  takenToday: (id: string) => boolean
  toggleComplianceToday: (id: string) => void
}) {
  const done = takenToday(item.id)
  return (
    <div style={{ textAlign: "center", display: "grid", gap: "6px" }}>
      <button
        type="button"
        onClick={() => toggleActive(item.id)}
        title="Pulsa para activar o desactivar en tu stack"
        style={{
          width: "36px",
          height: "36px",
          margin: "0 auto",
          borderRadius: "999px",
          border: `2px solid ${item.active ? "var(--color-accent-health)" : "var(--color-border)"}`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: item.active ? "var(--color-accent-health)" : "var(--color-text-secondary)",
          background: "transparent",
          cursor: "pointer",
        }}
      >
        ●
      </button>
      {editMode ? (
        <>
          <input
            value={item.name}
            onChange={(e) => updateSupplement(item.id, { name: e.target.value })}
            style={{
              fontSize: "10px",
              padding: "4px",
              borderRadius: "8px",
              border: "0.5px solid var(--color-border)",
              width: "100%",
            }}
          />
          <input
            value={item.amount}
            onChange={(e) => updateSupplement(item.id, { amount: e.target.value })}
            style={{
              fontSize: "10px",
              padding: "4px",
              borderRadius: "8px",
              border: "0.5px solid var(--color-border)",
              width: "100%",
            }}
          />
        </>
      ) : (
        <>
          <p style={{ margin: 0, fontSize: "11px", fontWeight: 500 }}>{item.name}</p>
          {item.indispensable ? (
            <span
              style={{
                margin: "0 auto",
                fontSize: "9px",
                fontWeight: 600,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                color: "var(--color-accent-danger)",
                border: "0.5px solid color-mix(in srgb, var(--color-accent-danger) 35%, transparent)",
                borderRadius: "999px",
                padding: "2px 8px",
                width: "fit-content",
              }}
            >
              Indispensable
            </span>
          ) : null}
          <p style={{ margin: 0, fontSize: "10px", color: "var(--color-text-secondary)" }}>{item.amount}</p>
          {item.active ? (
            <label
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "6px",
                fontSize: "10px",
                color: "var(--color-text-secondary)",
                cursor: "pointer",
                marginTop: "2px",
              }}
            >
              <input
                type="checkbox"
                checked={done}
                onChange={() => toggleComplianceToday(item.id)}
                aria-label={`Cumplimiento hoy: ${item.name}`}
              />
              <span>Hoy</span>
            </label>
          ) : null}
        </>
      )}
    </div>
  )
}

export function SupplementStackSection({
  supplements,
  activeCount,
  suppLoading,
  suppError,
  editMode,
  setEditMode,
  toggleActive,
  updateSupplement,
  takenToday,
  toggleComplianceToday,
}: Props) {
  const byDaypart = SUPPLEMENT_DAYPART_ORDER.map((dp) => ({
    daypart: dp,
    items: supplements.filter((s) => s.daypart === dp),
  })).filter((g) => g.items.length > 0)

  return (
    <Card>
      <div style={{ padding: "var(--spacing-md)", display: "grid", gap: "var(--spacing-md)" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "10px" }}>
          <div>
            <p
              style={{
                margin: 0,
                fontSize: "11px",
                textTransform: "uppercase",
                letterSpacing: "0.14em",
                color: "var(--color-text-secondary)",
              }}
            >
              Stack de suplementación
            </p>
            <p style={{ margin: "4px 0 0", fontSize: "12px", color: "var(--color-text-secondary)" }}>
              {activeCount}/{supplements.length} protocolos activos
              {suppLoading ? " · guardando…" : ""}
            </p>
            {suppError && (
              <p style={{ margin: "4px 0 0", fontSize: "11px", color: "var(--color-accent-danger)" }}>{suppError}</p>
            )}
          </div>
          <button
            type="button"
            onClick={() => setEditMode(!editMode)}
            style={{
              padding: "6px 10px",
              borderRadius: "10px",
              border: "0.5px solid var(--color-border)",
              background: editMode ? "var(--color-accent-health)" : "var(--color-surface-alt)",
              fontSize: "11px",
              color: editMode ? "white" : "inherit",
            }}
          >
            {editMode ? "Listo" : "Editar stack"}
          </button>
        </div>

        {editMode ? (
          <div className="w-full min-w-0 overflow-x-auto rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-alt)]/50">
            <table className="w-full min-w-[720px] border-collapse text-left text-[12px]">
              <thead>
                <tr className="border-b border-[var(--color-border)] text-[10px] uppercase tracking-[0.12em] text-[var(--color-text-secondary)]">
                  <th className="px-2 py-2 font-semibold">En stack</th>
                  <th className="px-2 py-2 font-semibold">Indispensable</th>
                  <th className="px-2 py-2 font-semibold">Nombre</th>
                  <th className="px-2 py-2 font-semibold">Dosis</th>
                  <th className="px-2 py-2 font-semibold">Momento</th>
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
                        aria-label={`Indispensable: ${row.name}`}
                      />
                    </td>
                    <td className="px-2 py-2 align-middle">
                      <input
                        value={row.name}
                        onChange={(e) => updateSupplement(row.id, { name: e.target.value })}
                        className="w-full min-w-[160px] rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-2 py-1.5 text-[12px]"
                      />
                    </td>
                    <td className="px-2 py-2 align-middle">
                      <input
                        value={row.amount}
                        onChange={(e) => updateSupplement(row.id, { amount: e.target.value })}
                        className="w-full min-w-[100px] rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-2 py-1.5 text-[12px]"
                      />
                    </td>
                    <td className="px-2 py-2 align-middle">
                      <select
                        value={row.daypart}
                        onChange={(e) => updateSupplement(row.id, { daypart: e.target.value as SupplementDaypart })}
                        className="w-full min-w-[130px] rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-2 py-1.5 text-[12px]"
                      >
                        {SUPPLEMENT_DAYPART_ORDER.map((dp) => (
                          <option key={dp} value={dp}>
                            {SUPPLEMENT_DAYPART_LABELS[dp]}
                          </option>
                        ))}
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="px-3 py-2 text-[10px] leading-snug text-[var(--color-text-secondary)]">
              El cumplimiento diario («Hoy») se guarda al marcar la casilla en la vista de lectura. Los datos van a tu
              perfil (Supabase) junto con el stack.
            </p>
          </div>
        ) : (
          <div style={{ display: "grid", gap: "var(--spacing-md)" }}>
            {byDaypart.map(({ daypart, items }) => (
              <div key={daypart}>
                <p
                  style={{
                    margin: "0 0 8px",
                    fontSize: "10px",
                    fontWeight: 600,
                    letterSpacing: "0.14em",
                    textTransform: "uppercase",
                    color: "var(--color-text-secondary)",
                  }}
                >
                  {SUPPLEMENT_DAYPART_LABELS[daypart]}
                </p>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(128px, 1fr))",
                    gap: "var(--spacing-md)",
                  }}
                >
                  {items.map((item) => (
                    <SupplementColumn
                      key={item.id}
                      item={item}
                      editMode={editMode}
                      toggleActive={toggleActive}
                      updateSupplement={updateSupplement}
                      takenToday={takenToday}
                      toggleComplianceToday={toggleComplianceToday}
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
