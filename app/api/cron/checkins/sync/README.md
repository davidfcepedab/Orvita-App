# Cron Job: Checkins Sync

## Descripción

Este cron job sincroniza automáticamente checkins desde Google Sheets a Supabase cada hora.

## Endpoint

`GET /api/cron/checkins/sync`

## Schedule

- **Frecuencia**: Cada hora (0 * * * *)
- **Plataforma**: Vercel Cron Jobs
- **Modo**: Server-side only

## Autenticación

### Vercel Cron Secret

El endpoint verifica el header `Authorization: Bearer <CRON_SECRET>` para asegurar que solo Vercel pueda ejecutarlo.

**Configuración requerida en Vercel:**

```bash
CRON_SECRET=tu_secret_aleatorio_aqui
```

Genera un secret seguro:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### Supabase Service Role

El cron usa `SUPABASE_SERVICE_ROLE_KEY` para bypass RLS y escribir directamente en la tabla `checkins`.

## Variables de Entorno Requeridas

### Esenciales

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJ...  # Service role key (NO anon key)

# Cron Security
CRON_SECRET=xxx  # Secret para autenticar requests de Vercel Cron

# Google Sheets
GOOGLE_CREDENTIALS={"client_email":"...","private_key":"..."}
# O alternativamente:
GOOGLE_SHEETS_API_KEY=xxx
```

### Configuración de Sheets (opcional)

```bash
# ID del spreadsheet
CHECKIN_MEASURES_SPREADSHEET_ID=1xxx
# O usa:
PERSONAL_SPREADSHEET_ID=1xxx

# Rango de lectura
CHECKIN_MEASURES_SHEET_RANGE="Respuestas!A:AA"
CHECKIN_SHEET_FIRST_ROW=2

# Mapeo de columnas de métricas corporales (JSON)
ORVITA_CHECKIN_BODY_METRICS_COLUMNS='{"peso":14,"pct_grasa":15,"cintura":16}'
```

## Flujo de Sincronización

1. **Autenticación**: Verifica `CRON_SECRET` en Authorization header
2. **Lectura**: Lee última fila no vacía de Google Sheets
3. **Verificación**: Chequea si `sheet_row_id` ya existe en BD
4. **Inserción**: Si no existe, crea nuevo checkin con:
   - Scores (global, físico, salud, profesional)
   - Body metrics (peso, % grasa, perímetros)
   - Metadata (sheet_row_id, source: "sheets")
5. **Retorno**: Estadísticas de sincronización

## Comportamiento

### Idempotencia

El cron NO duplica datos. Cada fila de Sheets se identifica por `sheet_row_id` único. Si ya existe, el cron retorna `synced: 0` sin insertar.

### User Association

Actualmente el cron asocia checkins al **primer usuario** encontrado en la tabla `users`.

**TODO**: Implementar lógica multi-usuario basada en:
- Columna de email/identificador en Sheets
- Household ID
- Default user per household

### Error Handling

- **401**: CRON_SECRET inválido o faltante
- **500**: Error de configuración (Supabase, Sheets)
- **200**: Sincronización exitosa o sin nuevos datos

## Testing Local

### Método 1: Simular Vercel Cron

```bash
export CRON_SECRET="test-secret-local"
export NEXT_PUBLIC_SUPABASE_URL="https://xxx.supabase.co"
export SUPABASE_SERVICE_ROLE_KEY="eyJ..."
export GOOGLE_CREDENTIALS='{"client_email":"...","private_key":"..."}'
export CHECKIN_MEASURES_SPREADSHEET_ID="1xxx"

curl http://localhost:3000/api/cron/checkins/sync \
  -H "Authorization: Bearer test-secret-local"
```

### Método 2: Vercel CLI

```bash
vercel env pull .env.local
npm run dev

# En otra terminal:
curl http://localhost:3000/api/cron/checkins/sync \
  -H "Authorization: Bearer $(grep CRON_SECRET .env.local | cut -d '=' -f2)"
```

## Monitoring

### Logs en Vercel

1. Ve a https://vercel.com/david-cepeda-org/orvita
2. Click en "Logs"
3. Filtra por path: `/api/cron/checkins/sync`

### Respuestas esperadas

**Sincronización exitosa:**
```json
{
  "success": true,
  "synced": 1,
  "message": "Checkin sincronizado exitosamente",
  "data": {
    "id": 123,
    "sheet_row_id": "42",
    "created_at": "2026-04-08T12:00:00Z"
  }
}
```

**Sin nuevos datos:**
```json
{
  "success": true,
  "synced": 0,
  "message": "Checkin sheet_row_id=42 ya existe (id=123)"
}
```

**Error:**
```json
{
  "success": false,
  "error": "Error al sincronizar checkins",
  "details": "..."
}
```

## Troubleshooting

### Error 403 en Deploy

❌ **Causa**: Cron configurado en vercel.json pero endpoint no existe
✅ **Solución**: Este archivo ya incluye el endpoint completo

### Error 401 "Unauthorized"

❌ **Causa**: CRON_SECRET no configurado o no coincide
✅ **Solución**: Configura CRON_SECRET en Vercel Environment Variables

### Error "Supabase no configurado"

❌ **Causa**: Falta SUPABASE_SERVICE_ROLE_KEY
✅ **Solución**: Ve a Supabase → Settings → API → service_role key (secret)

### No sincroniza datos nuevos

❌ **Causa**: Spreadsheet ID incorrecto o rango vacío
✅ **Solución**: Verifica las variables de entorno de Google Sheets

### "No se encontró usuario"

❌ **Causa**: Tabla `users` vacía
✅ **Solución**: Crea al menos un usuario o actualiza la lógica de user association

## Mejoras Futuras

- [ ] Multi-user sync basado en identificador en Sheets
- [ ] Webhook inverso: notificar a Sheets cuando se crea checkin manual
- [ ] Histórico de sincronización en tabla `sync_logs`
- [ ] Rate limiting y backoff exponencial
- [ ] Alertas en Slack/Discord cuando falla el cron
- [ ] Dashboard de métricas de sincronización

## Referencias

- [Vercel Cron Jobs](https://vercel.com/docs/cron-jobs)
- [Supabase Service Role](https://supabase.com/docs/guides/api#the-service_role-key)
- [Google Sheets API](https://developers.google.com/sheets/api)
