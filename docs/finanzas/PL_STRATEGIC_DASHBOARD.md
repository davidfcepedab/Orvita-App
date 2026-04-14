# P&L estratégico (especificación)

Referencia de producto y UI para el rediseño del **Estado de resultados** en Órbita: centro de control financiero alineado con una lectura rápida (Apple HIG, dashboards financieros minimalistas).

## Artefactos

| Archivo | Contenido |
|--------|-----------|
| [`pl-strategic-dashboard.json`](./pl-strategic-dashboard.json) | JSON declarativo (`PLStrategicDashboard`): secciones, charts, filtros, bindings y rutas de datos. |

## Narrativa de experiencia

La pantalla se comporta como un **panel de vuelo**, no como un libro contable. Arriba, un **único número hero** (flujo neto) con contexto (vs mes anterior, YTD). Debajo, **presiones máximo en cuatro tarjetas**, agrupadas por `financial_impact` del catálogo: capas semánticas con color (calma / atención / presión), no tablas largas.

La brecha **KPI ↔ mapa** se resume en **una frase ejecutiva** y acciones hacia conciliación o puentes. Los gráficos comprimen **tiempo** (tendencia) y **composición** (donut o barras). **Fijo vs variable** responde: ¿ajuste táctico o estructural? La ventana **90 días** conecta el mes con decisiones de corto plazo.

Lo detallado vive en **sheets** o rutas (`/finanzas/categories`, `/finanzas/transactions`), no como muro de números en la vista principal.

## Micro-interacciones

- **Tap en tarjeta de presión** → sheet con subcategorías top del `financial_impact`, variación vs mes anterior, badge fijo/variable, enlace a categorías.
- **Scrub en gráfico de tendencia** → tooltip con ingreso, gasto operativo, flujo; si el agrupamiento es `expense_type`, segunda línea con reparto fijo/variable.
- **Tap en segmento (donut)** → drill-down por `category` dentro del impacto.
- **Cambio de agrupación** → transición corta; conservar mes seleccionado.
- **Reduce Motion** → solo opacidad, sin translates agresivos.

## Datos e implementación

1. **Catálogo** `orbita_finance_subcategory_catalog`: join con transacciones por subcategoría; agregar por `financial_impact`, `expense_type`, `category`; respetar `budgetable` para brechas vs presupuesto si existen líneas presupuestarias.
2. **Transacciones** `finance_transactions`: actuals del mes y series históricas para tendencia y MoM.
3. **Snapshots** `finance_monthly_snapshots`: fallback cuando hay pocos movimientos (coherente con Resumen/overview).
4. **Coherencia** existente (`MonthFinanceCoherence` / capas canónicas) para el banner KPI ↔ mapa y reglas de acciones recomendadas.

Sugerencia de API: `GET /api/orbita/finanzas/pl-strategic?month=YYYY-MM&groupBy=financial_impact` devolviendo `hero`, `pressures[]`, `breakdown[]`, `fixed_vs_variable`, series de charts y `actions[]`.

## Visibilidad

Esta carpeta `docs/finanzas/` es la fuente de verdad del diseño hasta que el front consuma el JSON o tipos derivados en código.
