"use client"

/**
 * Ejemplo de uso de {@link PLStrategicCenter} con la spec JSON del repo y datos demo.
 * Montar en una ruta dev-only o sustituir `plStrategicCenterDemoData` por respuesta API.
 */
import plSpecJson from "../../../docs/finanzas/pl-strategic-center.json"
import { PLStrategicCenter } from "./PLStrategicCenter"
import {
  FinancialImpact,
  PlSemanticTone,
  type PlStrategicCenterRuntimeData,
  type PlStrategicCenterSpec,
} from "@/src/types/finanzas/pl-strategic-center"

/** Spec alineada a `docs/finanzas/pl-strategic-center.json`. */
export const plStrategicCenterDemoSpec = plSpecJson as unknown as PlStrategicCenterSpec

/** Datos de demostración — reemplazar por `GET /api/orbita/finanzas/pl-strategic-center`. */
export const plStrategicCenterDemoData: PlStrategicCenterRuntimeData = {
  meta: { monthYm: "2026-04", monthLabel: "abril de 2026" },
  hero: {
    netCop: 1_850_000,
    momDeltaCop: 220_000,
    momDeltaPct: 13.5,
    ytdNetCop: 5_200_000,
  },
  pressures: [
    {
      impact: FinancialImpact.Operativo,
      label: "Gasto operativo",
      amountCop: 4_200_000,
      momPct: 4,
      sparkline: [3.9, 4.0, 4.1, 4.0, 4.2, 4.2],
      tone: PlSemanticTone.Attention,
    },
    {
      impact: FinancialImpact.Inversion,
      label: "Inversión",
      amountCop: 800_000,
      momPct: -2,
      sparkline: [820, 810, 800, 790, 800, 800],
      tone: PlSemanticTone.Neutral,
    },
    {
      impact: FinancialImpact.Ajuste,
      label: "Ajustes",
      amountCop: 120_000,
      momPct: null,
      sparkline: [100, 110, 105, 120],
      tone: PlSemanticTone.Positive,
    },
    {
      impact: FinancialImpact.FinancieroEstructural,
      label: "Capa financiera",
      amountCop: 350_000,
      momPct: 0,
      sparkline: [340, 345, 350, 350, 350, 350],
      tone: PlSemanticTone.Neutral,
    },
  ],
  insightBanner: {
    primaryCop: 85_000,
    secondaryCop: 40_000,
    visible: true,
  },
  incomeExpenseSeries: [
    { monthYm: "2026-01", label: "Ene '26", ingresos: 5_000_000, gasto_operativo: 4_200_000, flujo: 800_000 },
    { monthYm: "2026-02", label: "Feb '26", ingresos: 5_100_000, gasto_operativo: 4_350_000, flujo: 750_000 },
    { monthYm: "2026-03", label: "Mar '26", ingresos: 5_200_000, gasto_operativo: 4_100_000, flujo: 1_100_000 },
    { monthYm: "2026-04", label: "Abr '26", ingresos: 6_050_000, gasto_operativo: 4_200_000, flujo: 1_850_000 },
  ],
  breakdownByImpact: [
    { impact: FinancialImpact.Operativo, label: "Operativo", valueCop: 4_200_000 },
    { impact: FinancialImpact.Inversion, label: "Inversión", valueCop: 800_000 },
    { impact: FinancialImpact.Ajuste, label: "Ajustes", valueCop: 120_000 },
    { impact: FinancialImpact.FinancieroEstructural, label: "Financiero", valueCop: 350_000 },
  ],
  fixedVsVariable: { fijoCop: 2_800_000, variableCop: 1_400_000 },
  trendFlujo: [
    { label: "Ene", flujo: 800_000 },
    { label: "Feb", flujo: 750_000 },
    { label: "Mar", flujo: 1_100_000 },
    { label: "Abr", flujo: 1_850_000 },
  ],
  projection: {
    series: [
      { label: "S1", value: 1_200_000 },
      { label: "S2", value: 980_000 },
      { label: "S3", value: 1_050_000 },
    ],
    confidence: "media",
  },
  cashMonthNetCop: 1_850_000,
  actions: [
    { id: "trim-variable-spike", title: "Ajustar gastos variables", href: "/finanzas/categories?highlight=variable" },
    { id: "close-gap", title: "Cerrar brecha KPI ↔ mapa", href: "/finanzas/pl#conciliation" },
    { id: "build-buffer", title: "Asignar colchón explícito", href: "/finanzas/cuentas" },
  ],
}

export function PLStrategicCenterExample() {
  return (
    <PLStrategicCenter
      spec={plStrategicCenterDemoSpec}
      data={plStrategicCenterDemoData}
      callbacks={{
        onPressureCardClick: () => {},
        onChartClick: () => {},
      }}
    />
  )
}
