# API Contract (v1.1.0)

All endpoints require:
```
Authorization: Bearer <supabase_access_token>
```

## GET /api/context
Response:
```
{
  "success": true,
  "data": {
    "score_global": 0,
    "score_fisico": 0,
    "score_salud": 0,
    "score_profesional": 0,
    "score_disciplina": 0,
    "score_recuperacion": 0,
    "delta_global": 0,
    "delta_disciplina": 0,
    "delta_recuperacion": 0,
    "delta_tendencia": 0,
    "tendencia_7d": [],
    "prediction": null,
    "insights": [],
    "today_tasks": [],
    "habits": []
  }
}
```

## /api/tasks
### GET
Query params: `domain=salud|fisico|profesional` (optional)

### POST
Body:
```
{ "title": "string", "domain": "salud|fisico|profesional", "completed": false }
```

### PATCH
Body:
```
{ "id": "uuid", "title": "string?", "completed": true?, "domain": "salud|fisico|profesional"? }
```

### DELETE
Body:
```
{ "id": "uuid" }
```

## /api/habits
### GET
Query params: `domain=salud|fisico|profesional` (optional)

### POST
Body:
```
{ "name": "string", "domain": "salud|fisico|profesional", "completed": false }
```

### PATCH
Body:
```
{ "id": "uuid", "name": "string?", "completed": true?, "domain": "salud|fisico|profesional"? }
```

### DELETE
Body:
```
{ "id": "uuid" }
```

## /api/checkins
### GET
Returns latest 30 checkins ordered by `created_at` desc.

### POST
Body (at least one field required):
```
{
  "score_global": 82,
  "score_fisico": 75,
  "score_salud": 88,
  "score_profesional": 90
}
```
