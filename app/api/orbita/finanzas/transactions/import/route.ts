import { NextRequest, NextResponse } from "next/server"
import { requireUser } from "@/lib/api/requireUser"
import { isAppMockMode, isSupabaseEnabled, UI_SYNC_OFF_SHORT } from "@/lib/checkins/flags"
import { ensureFinanceAccountsForLabels } from "@/lib/finanzas/ensureFinanceAccountsForLabels"
import { formatPostgrestError } from "@/lib/finanzas/subcategoryCatalog"
import { parseTransactionsImportCsv } from "@/lib/finanzas/parseTransactionsImportCsv"
import { getHouseholdId } from "@/lib/households/getHouseholdId"

export const runtime = "nodejs"

const IMPORT_MAX_ROWS = 300
const IMPORT_MAX_CSV_CHARS = 450_000
const INSERT_CHUNK = 120

export async function POST(req: NextRequest) {
  try {
    if (isAppMockMode()) {
      return NextResponse.json({ success: false, error: "No disponible en modo demo" }, { status: 400 })
    }
    if (!isSupabaseEnabled()) {
      return NextResponse.json({ success: false, error: UI_SYNC_OFF_SHORT }, { status: 503 })
    }

    const auth = await requireUser(req)
    if (auth instanceof NextResponse) return auth

    const householdId = await getHouseholdId(auth.supabase, auth.userId)
    if (!householdId) {
      return NextResponse.json({ success: false, error: "Usuario sin hogar asignado" }, { status: 403 })
    }

    const body = (await req.json()) as { csv?: unknown }
    const csv = typeof body.csv === "string" ? body.csv : ""
    if (!csv.trim()) {
      return NextResponse.json({ success: false, error: "csv requerido (texto CSV con cabecera)" }, { status: 400 })
    }
    if (csv.length > IMPORT_MAX_CSV_CHARS) {
      return NextResponse.json(
        { success: false, error: `El CSV supera el límite (${IMPORT_MAX_CSV_CHARS} caracteres)` },
        { status: 400 },
      )
    }

    const { rows: parsed, errors: parseErrors } = parseTransactionsImportCsv(csv)
    if (parsed.length === 0) {
      const hint = parseErrors[0]
        ? ` (Línea ${parseErrors[0].line}: ${parseErrors[0].message})`
        : ""
      return NextResponse.json({
        success: false,
        error: `No hay filas válidas para importar.${hint}`,
        data: { inserted: 0, parseErrors },
      }, { status: 400 })
    }
    if (parsed.length > IMPORT_MAX_ROWS) {
      return NextResponse.json(
        {
          success: false,
          error: `Máximo ${IMPORT_MAX_ROWS} movimientos por importación (recibidos ${parsed.length})`,
        },
        { status: 400 },
      )
    }

    let accountKeyToId: Map<string, string>
    try {
      accountKeyToId = await ensureFinanceAccountsForLabels(
        auth.supabase,
        householdId,
        parsed.map((p) => p.cuenta),
      )
    } catch (e) {
      console.error("IMPORT ensureFinanceAccountsForLabels:", e)
      return NextResponse.json(
        { success: false, error: formatPostgrestError(e) || "Error preparando cuentas" },
        { status: 400 },
      )
    }

    const now = new Date().toISOString()
    const insertPayload = parsed.map((p) => {
      const al = p.cuenta.trim()
      return {
        household_id: householdId,
        profile_id: auth.userId,
        date: p.fecha,
        description: p.concepto,
        category: p.categoria,
        subcategory: p.subcategoria ? p.subcategoria : null,
        account_label: al || null,
        finance_account_id: al ? (accountKeyToId.get(al.toLowerCase()) ?? null) : null,
        amount: p.monto,
        type: p.tipo,
        currency: "USD",
        created_at: now,
        updated_at: now,
        deleted_at: null,
      }
    })

    let inserted = 0
    for (let i = 0; i < insertPayload.length; i += INSERT_CHUNK) {
      const chunk = insertPayload.slice(i, i + INSERT_CHUNK)
      const { error } = await auth.supabase.from("orbita_finance_transactions").insert(chunk)
      if (error) {
        console.error("IMPORT insert:", formatPostgrestError(error))
        return NextResponse.json(
          {
            success: false,
            error: formatPostgrestError(error) || "Error insertando movimientos",
            data: { inserted, parseErrors },
          },
          { status: 400 },
        )
      }
      inserted += chunk.length
    }

    const months = new Map<string, { y: number; m: number }>()
    for (const p of parsed) {
      const y = Number(p.fecha.slice(0, 4))
      const m = Number(p.fecha.slice(5, 7))
      if (Number.isFinite(y) && m >= 1 && m <= 12) {
        months.set(`${y}-${m}`, { y, m })
      }
    }

    const snapshotWarnings: string[] = []
    for (const { y, m } of months.values()) {
      const { error: rpcErr } = await auth.supabase.rpc("rebuild_month_snapshot", {
        p_household: householdId,
        p_year: y,
        p_month: m,
      })
      if (rpcErr) {
        snapshotWarnings.push(`${y}-${String(m).padStart(2, "0")}: ${rpcErr.message}`)
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        inserted,
        parseErrors,
        snapshotWarnings: snapshotWarnings.length ? snapshotWarnings : undefined,
      },
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Error"
    console.error("TRANSACTIONS_IMPORT:", message)
    return NextResponse.json({ success: false, error: "Error importando movimientos" }, { status: 500 })
  }
}
