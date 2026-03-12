# API Contract — `/api/finanzas`

This document formally defines the response contract for every route under `/api/finanzas`.
All consumers (frontend pages, server-side components, external integrations) **must** treat this
document as the source of truth.

---

## 1. Standard Response Envelope

Every response from every route in this domain **must** conform to the following shape:

```ts
{
  success: boolean      // always present — true on success, false on error
  data?:   object       // present only on success; never returned at the root level
  error?:  string       // present only on failure; human-readable, no stack traces
}
```

### Rules

| Rule | Description |
|------|-------------|
| `success` is mandatory | Every response must include `success: true` or `success: false`. No exceptions. |
| Data lives inside `data` | No payload field may be returned at the root level alongside `success`. |
| Errors use `error: string` | Error responses use a single `error` string. No `details`, `message`, `stack`, or nested objects. |
| No stack traces | Internal error details must never be serialised into the response body. |
| No `fetch("localhost")` | Routes must not call `http://localhost` to talk to sibling routes. Use shared engines directly. |
| Raw row access is restricted | `row[NUMBER]` index access on spreadsheet data is only allowed inside `lib/` mappers/engines, never in route files. |

---

## 2. Endpoints

### 2.1 `GET /api/finanzas/categories`

Returns categorised expense data for the requested month, enriched with budget comparison.

#### Query Parameters

| Parameter | Type   | Required | Default              | Description |
|-----------|--------|----------|----------------------|-------------|
| `month`   | string | No       | Current month (YYYY-MM) | Month to query, e.g. `2025-03` |

#### Success Response — `200 OK`

```json
{
  "success": true,
  "data": {
    "structuralCategories": [
      {
        "name": "Hogar & Base",
        "total": -1500000,
        "previousTotal": -1400000,
        "delta": -100000,
        "type": "fixed",
        "budget": 1600000,
        "budgetUsedPercent": 93.75,
        "budgetStatus": "yellow",
        "subcategories": [
          { "name": "Arriendo", "total": -1000000 },
          { "name": "Servicios", "total": -500000 }
        ]
      }
    ],
    "financialCategories": [
      { "name": "Finanzas", "total": -200000 }
    ],
    "totalFixed": -1500000,
    "totalVariable": -800000,
    "totalStructural": -2300000,
    "totalFinancialFlow": -200000
  }
}
```

#### Error Response — `500 Internal Server Error`

```json
{
  "success": false,
  "error": "Error cargando categorías"
}
```

#### Technical Notes

- **Data source (movements):** Google Sheets — spreadsheet `1A8ucJUgSvxP2JLbPf1Z5PlB5UytbO4aKdJLf_ctaUz4`, range `Movimientos!A2:U5000`
- **Data source (budget):** Same spreadsheet, range `Presupuesto!A2:C200`
- **Engines used:**
  - `lib/engines/financialAdvancedEngine` — groups rows by category/subcategory for current and previous month
  - `lib/engines/financialBudgetEngine` — overlays budget limits onto the structural categories
- `budgetStatus` values: `"green"` (< 85 %), `"yellow"` (85–99 %), `"red"` (≥ 100 %)
- Categories `"Finanzas"` and `"Movimientos Financieros"` are excluded from structural totals and returned in `financialCategories` instead
- Fixed categories: `"Hogar & Base"`, `"Obligaciones"`, `"Suscripciones"`, `"Desarrollo"`

---

### 2.2 `GET /api/finanzas/overview`

Returns monthly financial KPIs, liquidity metrics, trend history, and analytical scores for the
requested month.

#### Query Parameters

| Parameter | Type   | Required | Default                      | Description |
|-----------|--------|----------|------------------------------|-------------|
| `month`   | string | No       | Latest month in the dataset  | Month to query, e.g. `2025-03` |

#### Success Response — `200 OK`

```json
{
  "success": true,
  "data": {
    "ingresos": 5000000,
    "gasto_operativo": -3200000,
    "gasto_financiero": -400000,
    "flujo_total": 1400000,
    "liquidez": 12000000,
    "runway": 3.3,
    "monthlyData": [
      {
        "month": "2024-10",
        "ingresos": 4800000,
        "gasto_operativo": 3100000,
        "gasto_financiero": 380000,
        "flujo": 1320000
      }
    ],
    "score": 72,
    "insight": {
      "type": "info",
      "message": "Situación financiera estable.",
      "all": ["Situación financiera estable."]
    },
    "stability": {
      "scoreOperativo": 75,
      "scoreLiquidez": 60,
      "scoreRiesgo": 75,
      "stabilityIndex": 69,
      "status": "yellow"
    },
    "prediction": {
      "projection": [
        { "month": "+1", "projectedBalance": 10600000 },
        { "month": "+2", "projectedBalance": 9200000 },
        { "month": "+3", "projectedBalance": 7800000 }
      ]
    }
  }
}
```

#### Error Response — `404 Not Found` (no data in sheet)

```json
{
  "success": false,
  "error": "Sin datos financieros"
}
```

#### Error Response — `500 Internal Server Error`

```json
{
  "success": false,
  "error": "Error cargando overview financiero"
}
```

#### Technical Notes

- **Data source (KPIs):** Google Sheets — spreadsheet `1A8ucJUgSvxP2JLbPf1Z5PlB5UytbO4aKdJLf_ctaUz4`, range `Base mensual CFO!A2:H1000`
  - Column mapping: `[0]` month, `[1]` ingresos, `[2]` gasto operativo, `[3]` gasto financiero, `[6]` flujo total
- **Data source (liquidity):** Same spreadsheet, range `Cuentas!A2:J200`
  - Column `[5]` is the available balance per account; only positive balances are summed
- **Engines used:**
  - `lib/engines/financialScoreEngine` — composite health score 0–100
  - `lib/engines/financialInsightEngine` — human-readable textual insight
  - `lib/engines/financialStabilityEngine` — three-axis stability index with traffic-light status
  - `lib/engines/financialPredictionEngine` — 3-month forward projection based on average monthly flow
- `runway` = total liquidity ÷ average monthly spend, in months (1 decimal place)
- `monthlyData` always contains the last 6 available months
- If `month` is not found in the sheet, the most recent row is used as a fallback

---

### 2.3 `GET /api/finanzas/transactions`

Returns the list of individual movements for the requested month, optionally filtered by category.

#### Query Parameters

| Parameter  | Type   | Required | Default              | Description |
|------------|--------|----------|----------------------|-------------|
| `month`    | string | No       | Current month (YYYY-MM) | Month to query, e.g. `2025-03` |
| `category` | string | No       | —                    | Filter by category name (exact match) |

#### Success Response — `200 OK`

```json
{
  "success": true,
  "data": {
    "transactions": [
      {
        "id": "2025-03-05-0",
        "date": "2025-03-05",
        "description": "Pago arriendo",
        "category": "Hogar & Base",
        "subcategory": "Arriendo",
        "amount": -1000000
      }
    ],
    "subtotal": -1000000,
    "previousSubtotal": 0,
    "delta": 0
  }
}
```

#### Error Response — `500 Internal Server Error`

```json
{
  "success": false,
  "error": "Error cargando transacciones"
}
```

#### Technical Notes

- **Data source:** Google Sheets — spreadsheet `1fEP_Em30-BTUhmeObzAE9zObQRc7CNkYXbVCecpCHO0`, range `Movimientos!A2:U5000`
  - Row filtering uses column `[12]` (month) and `[6]` (category)
  - Field mapping: `[0]` date, `[5]` description, `[6]` category, `[7]` subcategory, `[10]` amount
- `id` is a synthetic key: `"${date}-${rowIndex}"` — stable within a single response, not globally unique across requests
- `previousSubtotal` and `delta` are reserved fields currently hardcoded to `0`; they are placeholders for future period-over-period comparison
- Negative `amount` values represent expenses; positive values represent income

---

### 2.4 `GET /api/finanzas/insights`

Returns a list of actionable financial insights derived from the current month's category data.

#### Query Parameters

None.

#### Success Response — `200 OK`

```json
{
  "success": true,
  "data": {
    "insights": [
      { "type": "alert", "message": "Estás operando en déficit." },
      { "type": "focus", "message": "Tu mayor gasto está en Hogar & Base." }
    ]
  }
}
```

#### Error Response — `500 Internal Server Error`

```json
{
  "success": false,
  "error": "Error cargando insights"
}
```

#### Technical Notes

- **Data dependency:** Internally calls `/api/finanzas/categories` to obtain `data.structuralCategories`
- **Engine used:** `lib/engines/financialInsightsEngine`
- Insight types: `"alert"` (negative signal), `"focus"` (category to watch)
- Returns an empty array `[]` when no categories are available
- `flujo` is currently hardcoded to `-1` in the insights engine call; connecting real flow data is a pending improvement

---

## 3. Mandatory Project Rules

The following rules apply to **all current and future routes** under `/api/finanzas`:

### 3.1 Envelope compliance
Every route **must** return the standard envelope defined in Section 1. No route may return
a flat object at the root level (e.g. `{ transactions: [...] }` without `success` and `data`).

### 3.2 No data outside `data`
All payload fields must be nested under `data`. Fields such as `ingresos`, `transactions`,
`insights`, etc. must never appear at the root of the response alongside `success`.

### 3.3 No stack traces in responses
`error` must be a fixed, user-safe string. The underlying `error.message` or `error.stack`
must only be written to server logs (e.g. `console.error`), never serialised into the HTTP
response.

### 3.4 No `fetch("localhost")` between routes
Routes must not make HTTP calls to sibling routes via `http://localhost:PORT/api/…`.
Shared computation must be extracted into engines under `lib/` and imported directly.
The current `insights` route is the one known exception and should be migrated.

### 3.5 Raw row index access (`row[NUMBER]`) restricted to `lib/`
Spreadsheet row access by numeric index (e.g. `row[6]`, `row[12]`) may only appear inside
files under `lib/engines/` or `lib/mappers/`. Route files in `app/api/` must receive
already-mapped objects from these libraries.

---

## 4. Future Versioning

### Strategy: additive versioning with envelope stability

The current domain is unversioned (`/api/finanzas/…`). When breaking changes become
necessary, the recommended path is:

#### Step 1 — Introduce `/api/v1/finanzas/…`
Create new versioned route files under `app/api/v1/finanzas/`. The unversioned routes
remain untouched and continue to serve existing frontend consumers.

```
app/
  api/
    finanzas/          ← current (v0), keep alive
      categories/route.ts
      overview/route.ts
    v1/
      finanzas/        ← new version
        categories/route.ts
        overview/route.ts
```

#### Step 2 — Shared engines, new shapes
Engines in `lib/` are version-agnostic. A v1 route can import the same engine and simply
reshape the `data` object to the new contract without touching shared business logic.

#### Step 3 — Frontend migration
Update frontend fetch calls one page at a time from `/api/finanzas/X` to
`/api/v1/finanzas/X`. Because the outer envelope (`success`, `data`, `error`) is stable,
only the `data` field shape needs to be updated in each consumer.

#### Step 4 — Sunset unversioned routes
Once all frontend pages have migrated, add deprecation headers to the old routes:

```ts
return NextResponse.json(payload, {
  headers: { "Deprecation": "true", "Sunset": "2026-01-01" }
})
```

Remove the unversioned routes after the sunset date.

#### Non-breaking changes (safe without versioning)
- Adding new **optional** fields inside `data`
- Adding new optional query parameters with safe defaults
- Changing error message strings

#### Breaking changes (require a new version)
- Renaming or removing fields inside `data`
- Changing the type of an existing field
- Making a previously optional query parameter required
- Changing HTTP status codes for existing success responses
