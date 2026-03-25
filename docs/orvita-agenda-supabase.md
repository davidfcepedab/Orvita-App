# Órvita OS — Agenda en Supabase (híbrido)

## Env vars (Vercel)

### Supabase
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY` (solo server; para endpoints + cron)
- `NEXT_PUBLIC_SUPABASE_URL` (browser)
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` *(o compat: `NEXT_PUBLIC_SUPABASE_ANON`)*

### Sheets (fallback)
- `DAVID_AGENDA_SPREADSHEET_ID` *(o `AGENDA_SPREADSHEET_ID`)*
- `ESPOSO_AGENDA_SPREADSHEET_ID` *(o `AGENDA_SPREADSHEET_ID`)*

### Feature flags (fuente de datos)
Valores: `supabase` | `sheets` | `hybrid`
- `ORVITA_SOURCE` (default `hybrid`)
- `ORVITA_SOURCE_TASKS`
- `ORVITA_SOURCE_HABITS`
- `ORVITA_SOURCE_PROJECTS`
- `ORVITA_SOURCE_CALENDAR_EVENTS`
- `ORVITA_FALLBACK_TO_SHEETS` (default `true`)

## API routes agregadas

Todas aceptan `?profileId=david|esposo` (si no se manda usa `DEFAULT_PROFILE_ID` o `david`).

- `GET /api/orbita/tasks`
- `POST /api/orbita/tasks` (upsert)
- `DELETE /api/orbita/tasks?id=...` (o JSON `{ "id": "..." }`)

- `GET /api/orbita/habits`
- `POST /api/orbita/habits` (upsert)
- `DELETE /api/orbita/habits?id=...`

- `GET /api/orbita/projects`
- `GET /api/orbita/calendar-events&from=...&to=...`

## Realtime (hábitos)

Componente client: `components/orbita/HabitsRealtimeListener.tsx`.

Requiere habilitar Realtime para `public.orbita_habits` en Supabase (Database → Replication / Realtime).

