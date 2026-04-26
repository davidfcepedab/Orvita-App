# Importación de Apple Health desde Atajos (iOS) → RESET OS / Órvita

El envío puede automatizarse cada día; el **token de importación** en cabecera `x-orvita-import-token` es **persistente** (no se rota por calendario): se configura una vez en Atajos y solo cambia si lo regeneras o revocas en Configuración.

## Enlace de instalación en iCloud (Atajos / Apple)

Enlace canónico compartido para instalar el atajo desde iPhone/iPad (pegar en `NEXT_PUBLIC_ORVITA_HEALTH_SHORTCUT_ICLOUD_URL` en Vercel u otro hosting):

<https://www.icloud.com/shortcuts/4a508d78d83f454090ceab97fd9f3c69>

Si al abrirlo en un navegador de escritorio aparece *Not Found* o carga vacía, es habitual: vuelve a abrirlo desde el dispositivo o revisa en Atajos que el atajo siga con **Enlace de iCloud** activo (Compartir → opciones de enlace). Tras publicar un cambio, copia de nuevo el enlace y actualiza la variable.

## Nombre sugerido del atajo

**Órvita – Importar Salud Hoy**

## Automatización

1. **Atajos** → **Automatización** → **Hora del día**
2. Ejecutar diariamente (por ejemplo **8:00 a.m.**)
3. **Ejecutar inmediatamente** al activarse
4. Sin pedir confirmación, si iOS lo permite (según dispositivo y iOS, puede no ser posible en todos los flujos)

## Ventana de datos (recomendación operativa)

- `observed_at` = **fecha de referencia** en formato `yyyy-MM-dd` (p. ej. el día cuyo resumen de Salud quieres enviar: muchos flujos usan *ayer* al automatizarlo por la mañana)
- En consultas de Salud del atajo, usar **últimos 1 día** o equivalente
- **Agrupar por día** cuando la app de Salud lo permita; tomar un valor **consolidado** del grupo (suma, media, etc. según la métrica)
- **Limitación**: los filtros de fechas en Atajos no son siempre tan flexibles como en HealthKit; evita lógica que dependa de una *hora exacta* imposible de filtrar en el atajo

## Métricas que la API acepta (contrato mínimo)

- `observed_at` (obligatoria)
- `steps`
- `hrv_ms`
- `resting_hr_bpm`
- `active_energy_kcal`
- `workouts_duration_seconds`
- `sleep_duration_seconds` (o `sleep_hours` alternativo, ver código)

Otras claves del contrato extendido (p. ej. `vo2_max`, `workouts_count`) se siguen guardando en `metadata` y señales extendidas; ver `lib/integrations/appleHealthBundleContract.ts`.

## Cuerpo JSON recomendado (envuelto en `apple_bundle`)

```json
{
  "apple_bundle": {
    "observed_at": "2026-04-25",
    "steps": 6413,
    "hrv_ms": 22.5259920973064,
    "resting_hr_bpm": 71,
    "active_energy_kcal": 252.323,
    "workouts_duration_seconds": 10080,
    "sleep_duration_seconds": 34513.7013838
  },
  "source": "ios_shortcuts",
  "schema_version": "1.0"
}
```

También se acepta el **mismo diccionario en la raíz** (sin anidar) por compatibilidad, siempre excluyendo claves de control como `import_token` o `entries`.

## URL del endpoint (producción)

`POST` → `https://orvita.app/api/integrations/health/apple/import`

(En desarrollo: mismo path relativo al origen, p. ej. `http://localhost:3000/api/integrations/health/apple/import`.)

## Cabeceras

- `Content-Type: application/json` (obligatoria)
- **Autenticación** (una de las dos):
  - `Authorization: Bearer <access_token de sesión Supabase>`, o
  - **`x-orvita-import-token: <token persistente>`** — se genera **una vez** en **Configuración** (bloque Atajo / token de importación); el servidor guarda solo el hash (SHA-256). No caduca por tiempo; si **regeneras** o **revocas** en la web, deja de valer y debes pegar el nuevo valor en Atajos.
- Alias soportado (compatibilidad): `x-reset-token: <mismo token>` que enviarías en `x-orvita-import-token`.
- **`x-orvita-observed-at: yyyy-MM-dd`** (recomendada en Atajos): si el cuerpo JSON serializa `observed_at` como `null`, el servidor toma la fecha de esta cabecera. El plist generado por `scripts/build-orvita-health-shortcut.py` la envía enlazada a la misma fecha que `apple_bundle.observed_at`. Alias: `x-observed-at`.

**No** incluyas el token en el cuerpo JSON a menos que uses el campo `import_token` documentado; no se registra el JSON completo en producción en logs de servidor.

## Comportamiento del servidor (resumen)

- Acepta `apple_bundle` o payload plano, y `entries[]` si se envía un arreglo de filas
- Convierte números legados que lleguen **como string**; ignora `null`, `undefined`, `""` y cadenas tipo “No encontrado”
- Rechazos a nivel de **métrica** no invalidan otras; si nada de lo enviado es numérico útil, el error explica claves y sugerencia
- **Persistencia:** upsert lógico por `user_id` + **día UTC** de `observed_at` + `source` (`apple_health_export`), haciendo merge de columnas
- Analítica básica expuesta vía `GET /api/integrations/health/metrics` (campo `analytics`)

## UI

- **Configuración** ([`/configuracion`](https://orvita.app/configuracion)): generar, regenerar, copiar (solo al crear) y revocar el token de importación para Atajos.
- **Operaciones de Salud** ([`/health`](https://orvita.app/health)): lectura y atajo; la administración del token vive en Configuración.
- **Check-in**: franja informativa con enlace a `/health` cuando la nube está activa
- `/sistema` redirige a `/health` (compatibilidad con enlaces antiguos)

## V2 (no implementado aún en este documento)

- Importación histórica (p. ej. último año) en lote
- `entries[]` batch y deduplicación avanzada
- Baselines móviles 28 días, alertas semanales
- Sustitución de proxies de carga por integración plena (p. ej. Hevy) donde aplique
