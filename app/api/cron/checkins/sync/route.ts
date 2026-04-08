import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import {
  fetchSpreadsheetValues,
  pickLastNonEmptyRow,
  resolveCheckinSheetFirstRowNumber,
  resolveCheckinSheetRangeA1,
  resolveCheckinSpreadsheetId,
} from "@/lib/checkins/sheetsAccess"
import { mergeSheetRowIntoPreload } from "@/lib/checkins/checkinSheetPreload"
import { parseCheckinRowToSummary } from "@/lib/checkins/checkinSummary"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

/**
 * Vercel Cron Job: Sincroniza checkins desde Google Sheets a Supabase
 *
 * Autenticación: Vercel Cron (CRON_SECRET) + Supabase Service Role Key
 * Schedule: Configurado en vercel.json
 *
 * Flujo:
 * 1. Verifica autenticación de Vercel Cron
 * 2. Lee última fila de Google Sheets
 * 3. Verifica si ya existe en Supabase (por sheet_row_id)
 * 4. Si no existe, inserta el checkin
 * 5. Retorna estadísticas de sincronización
 */
export async function GET(req: NextRequest) {
  try {
    // 1. Verificar autenticación de Vercel Cron
    const authHeader = req.headers.get("authorization")
    const cronSecret = process.env.CRON_SECRET

    if (cronSecret) {
      if (authHeader !== `Bearer ${cronSecret}`) {
        return NextResponse.json(
          { success: false, error: "Unauthorized" },
          { status: 401 }
        )
      }
    }

    // 2. Verificar configuración de Supabase
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json({
        success: false,
        error: "Supabase no configurado correctamente",
        details: {
          hasUrl: !!supabaseUrl,
          hasServiceKey: !!supabaseServiceKey,
        },
      }, { status: 500 })
    }

    // 3. Crear cliente de Supabase con service role (bypasses RLS)
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // 4. Obtener configuración de Google Sheets
    const spreadsheetId = resolveCheckinSpreadsheetId()
    if (!spreadsheetId) {
      return NextResponse.json({
        success: true,
        synced: 0,
        message: "Sin CHECKIN_MEASURES_SPREADSHEET_ID configurado",
      })
    }

    const range = resolveCheckinSheetRangeA1()
    const firstRow = resolveCheckinSheetFirstRowNumber()

    // 5. Leer datos de Google Sheets
    const values = await fetchSpreadsheetValues(spreadsheetId, range)

    if (!values || values.length === 0) {
      return NextResponse.json({
        success: true,
        synced: 0,
        message: "No hay datos en la hoja",
      })
    }

    // 6. Obtener última fila no vacía
    const last = pickLastNonEmptyRow(values, firstRow)
    if (!last) {
      return NextResponse.json({
        success: true,
        synced: 0,
        message: "No se encontró fila con datos",
      })
    }

    // 7. Parsear datos de la fila
    const merged = mergeSheetRowIntoPreload(last.cells, last.sheetRowId)
    const summary = parseCheckinRowToSummary(last.cells)

    // 8. Verificar si ya existe este sheet_row_id en la base de datos
    const { data: existing, error: checkError } = await supabase
      .from("checkins")
      .select("id, sheet_row_id")
      .eq("sheet_row_id", last.sheetRowId)
      .limit(1)
      .maybeSingle()

    if (checkError) {
      throw new Error(`Error al verificar checkin existente: ${checkError.message}`)
    }

    if (existing) {
      return NextResponse.json({
        success: true,
        synced: 0,
        message: `Checkin sheet_row_id=${last.sheetRowId} ya existe (id=${existing.id})`,
        existing: {
          id: existing.id,
          sheet_row_id: existing.sheet_row_id,
        },
      })
    }

    // 9. Obtener el user_id del household default o primer usuario
    // NOTA: Ajustar según tu lógica de negocio
    const { data: users, error: userError } = await supabase
      .from("users")
      .select("id")
      .limit(1)
      .single()

    if (userError || !users) {
      throw new Error("No se encontró usuario para asociar el checkin")
    }

    // 10. Insertar nuevo checkin
    const { data: inserted, error: insertError } = await supabase
      .from("checkins")
      .insert({
        user_id: users.id,
        score_global: summary?.overall ?? 0,
        score_fisico: summary?.physical ?? 0,
        score_salud: summary?.health ?? 0,
        score_profesional: summary?.professional ?? 0,
        body_metrics: merged,
        sheet_row_id: last.sheetRowId,
        source: "sheets",
        notes: `Auto-sync desde Google Sheets - Fila ${last.sheetRowId}`,
      })
      .select("id, sheet_row_id, created_at")
      .single()

    if (insertError) {
      throw new Error(`Error al insertar checkin: ${insertError.message}`)
    }

    // 11. Retornar resultado exitoso
    return NextResponse.json({
      success: true,
      synced: 1,
      message: "Checkin sincronizado exitosamente",
      data: {
        id: inserted.id,
        sheet_row_id: inserted.sheet_row_id,
        created_at: inserted.created_at,
      },
    })

  } catch (error: unknown) {
    const detail = error instanceof Error ? error.message : "Error desconocido"
    console.error("CRON CHECKINS SYNC ERROR:", detail, error)
    return NextResponse.json(
      {
        success: false,
        error: "Error al sincronizar checkins",
        details: detail,
      },
      { status: 500 }
    )
  }
}
