# P&L estratégico — centro de control (`PLStrategicCenter`)

Especificación de producto y UI para el **Estado de resultados** en Órbita: un **centro de control financiero** alineado con HIG (espaciado generoso, tipografía dinámica, color semántico suave) y dashboards financieros minimalistas 2025–2026.

## Artefactos

| Archivo | Contenido |
|--------|-----------|
| **[`pl-strategic-center.json`](./pl-strategic-center.json)** | JSON declarativo **v2** (`PLStrategicCenter`): `header`, `pressuresSection`, `charts`, `actions`, `filters`, tokens, estados hover/tap, bindings a catálogo y transacciones. **Fuente de verdad actual.** |
| [`pl-strategic-dashboard.json`](./pl-strategic-dashboard.json) | Versión anterior (`PLStrategicDashboard`); conservada como referencia; preferir `pl-strategic-center.json` para implementación nueva. |

## Cómo se siente la experiencia (narrativa)

La pantalla **no compite con un Excel**: compite con la claridad de un **widget nativo premium**. El **flujo neto** domina el header en tamaño grande; debajo, **una sola fila de contexto** (vs mes anterior con flecha y %, YTD) responde “¿mejor o peor que el mes pasado?” y “¿cómo va el año?” sin abrir menús.

Las **3–4 presiones** no son partidas contables: son **capas semánticas** (`financial_impact`) con **color calmado** (rosa suave / ámbar / verde / gris) y una **micro-tendencia** (sparkline) que dice si la presión **acelera o se estabiliza**. El usuario entiende **dónde duele** antes de leer un número largo.

Los **gráficos** son pocos y **mutuamente explicativos**: ingresos vs gasto operativo en el tiempo, composición del mes (donut o barras), fijo vs variable en el operativo. La **proyección 90 días** y el **flujo de caja** cierran el circuito “mes → horizonte”, alineado con Órbita como **sistema operativo estratégico** (capital = tiempo, energía, dinero): **una sola superficie**, flujo constante, **cero tablas densas** en la vista principal.

### Por qué elimina el desorden actual

- **Jerarquía fija**: hero → presiones → 2–3 gráficos → proyección → acciones. Nada de “todo a la vez”.
- **Detalle bajo demanda**: drill-down en sheet o rutas (`/finanzas/categories`, `/finanzas/transactions`), no listas interminables en la misma pantalla.
- **Semántica primero**: `financial_impact` y `expense_type` **organizan la lectura**, no el orden alfabético de partidas.

## Micro-interacciones

| Acción | Resultado |
|--------|-----------|
| **Tap en tarjeta de presión** | Hoja inferior con **subcategorías de mayor monto** dentro de ese `financial_impact`, badge **fijo/variable**, delta vs mes anterior; fila → categorías con foco. |
| **Hover / scrub en gráfico ingresos vs gastos** | Línea vertical; tooltip con ingreso, gasto operativo, flujo; si el filtro activo es **expense_type**, segunda línea con **% fijo / % variable** (dentro del operativo). |
| **Tap en segmento del donut** | Resalta segmento; sheet con **categories** dentro de ese impacto; segunda tap → subcategoría. |
| **Cambio “Agrupar por”** | Transición cruzada corta (opacity); **no** cambiar el mes para evitar desorientación. |
| **Scroll con hero sticky** | El bloque hero pasa a **compacto** (una línea: neto + delta) para dar aire a gráficos. |
| **Reduce Motion** | Sin scale en presión; solo **opacity** en aparición de tooltips y sheets. |

## Implementación práctica

1. **Catálogo** `orbita_finance_subcategory_catalog`: join con transacciones; agregar `SUM(amount)` por `financial_impact`, `expense_type`, `category`, `subcategory`; filtrar **operativo** donde aplique para gráficos de gasto analítico.
2. **`budgetable`**: si existen líneas de presupuesto en el esquema, `brecha = presupuesto − actual` solo para filas presupuestables; si no hay presupuesto, ocultar modo “vs presupuesto”.
3. **`finance_transactions`**: series mensuales para tendencia, MoM y sparklines.
4. **`finance_monthly_snapshots`**: fallback cuando el mes tiene pocos movimientos (misma filosofía que Resumen).
5. **Brecha KPI ↔ mapa**: reutilizar `MonthFinanceCoherence` / capas canónicas ya existentes para el `insightBanner` y reglas de acciones.

**API sugerida:** `GET /api/orbita/finanzas/pl-strategic-center?month=YYYY-MM&groupBy=financial_impact|expense_type` devolviendo payload alineado con las secciones del JSON.

## Visibilidad

La carpeta `docs/finanzas/` permanece como **fuente de verdad** hasta que el front consuma este JSON o tipos TypeScript derivados.
