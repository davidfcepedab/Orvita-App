# API Contract — Finanzas Module

All endpoints follow the same response envelope:

```json
{ "success": true, "data": { ... } }
{ "success": false, "error": "Human-readable message" }
```

---

## GET /api/finanzas/overview

Returns KPIs and historical monthly data for the selected month.

### Query Parameters
| Parameter | Type   | Required | Default      | Description          |
|-----------|--------|----------|--------------|----------------------|
| `month`   | string | No       | Current month | Format: `YYYY-MM`   |

### Response
```json
{
  "success": true,
  "ingresos": 5000000,
  "flujo_total": 800000,
  "liquidez": 12000000,
  "runway": 4.2,
  "monthlyData": [
    { "month": "2025-01", "ingresos": 4800000, "gasto_operativo": 3200000, "flujo": 1600000 }
  ]
}
```

---

## GET /api/finanzas/categories

Returns structural spending categories (fixed + variable) with budget tracking.

### Query Parameters
| Parameter | Type   | Required | Default      | Description        |
|-----------|--------|----------|--------------|--------------------|
| `month`   | string | No       | Current month | Format: `YYYY-MM` |

### Response
```json
{
  "VERSION": "INSIGHT_V2_ACTIVA",
  "structuralCategories": [
    {
      "name": "Hogar & Base",
      "type": "fixed",
      "total": -1200000,
      "previousTotal": -1100000,
      "delta": -100000,
      "budget": 1300000,
      "budgetUsedPercent": 92.3,
      "budgetStatus": "yellow",
      "subcategories": [
        { "name": "Arriendo", "total": -800000 }
      ]
    }
  ],
  "financialCategories": [],
  "totalFixed": -2500000,
  "totalVariable": -1800000,
  "totalStructural": -4300000,
  "totalFinancialFlow": 0,
  "insight": { ... },
  "prediction": { ... }
}
```

### Budget Status Values
| Value    | Condition               | Color   |
|----------|-------------------------|---------|
| `green`  | `budgetUsedPercent < 85`  | Green  |
| `yellow` | `85 ≤ budgetUsedPercent < 100` | Amber |
| `red`    | `budgetUsedPercent ≥ 100` | Red   |

---

## GET /api/finanzas/transactions

Returns individual transactions for a month, optionally filtered by category/subcategory.

### Query Parameters
| Parameter     | Type   | Required | Default       | Description             |
|---------------|--------|----------|---------------|-------------------------|
| `month`       | string | No       | Current month | Format: `YYYY-MM`       |
| `category`    | string | No       | —             | Filter by category name |
| `subcategory` | string | No       | —             | Filter by subcategory   |

### Response
```json
{
  "success": true,
  "transactions": [
    {
      "id": "2025-01-15-0",
      "date": "2025-01-15",
      "description": "Pago arriendo",
      "amount": -800000,
      "category": "Hogar & Base",
      "subcategory": "Arriendo"
    }
  ],
  "total": -800000
}
```

---

## GET /api/finanzas/insights

Returns financial health score, stability metrics, insights, and prediction.

### Query Parameters
| Parameter | Type   | Required | Default      | Description        |
|-----------|--------|----------|--------------|--------------------|
| `month`   | string | No       | Current month | Format: `YYYY-MM` |

### Response
```json
{
  "success": true,
  "data": {
    "score": { "total": 72, "label": "Saludable", "components": {} },
    "insight": {
      "alerts": [],
      "recommendations": [],
      "highlights": []
    },
    "stability": {
      "liquidez": 12000000,
      "runway": 4.2,
      "label": "Estable"
    },
    "prediction": {
      "nextMonthEstimate": 4200000
    }
  }
}
```

---

## Sheets Data Sources

| Sheet name         | Range         | Used by              |
|--------------------|---------------|----------------------|
| Movimientos        | A2:U5000      | overview, categories, transactions, insights |
| Presupuesto        | A2:C200       | categories, insights |
| Base mensual CFO   | A2:H1000      | overview, insights   |
| Cuentas            | A2:J200       | overview, insights   |
