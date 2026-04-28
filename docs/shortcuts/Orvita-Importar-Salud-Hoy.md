# Atajo **Orvita-Importar-Salud-Hoy** (Apple Health → Órvita)

Flujo canónico: el iPhone lee métricas de **Salud** (y entrenos), arma un JSON y hace **POST** a Órvita. El servidor valida la sesión o el **token de importación**, persiste en `health_metrics` con `source = apple_health_shortcut` (cuando el origen es el atajo; ver abajo), y el contexto operativo (`/api/context`) mezcla esas señales con check-ins y **Capital** (Palanca #1).

## Artefactos en el repo

| Artefacto | Uso |
|-----------|-----|
| `public/shortcuts/Orvita-Importar-Salud-Hoy.shortcut` | Descarga / instalación (`shortcuts://import-shortcut?url=…`). Firmado en macOS con `shortcuts sign`. |
| `scripts/shortcuts/orvita-importar-salud-hoy.shortcut.src.plist` | Plist fuente (también regenerable). |
| `scripts/build-orvita-health-shortcut.py` | Genera el plist: `python3 scripts/build-orvita-health-shortcut.py` |

Nombre exacto en la biblioteca de Atajos: **Orvita-Importar-Salud-Hoy** (debe coincidir con `ORVITA_HEALTH_SHORTCUT_NAME` en `lib/shortcuts/orvitaHealthShortcut.ts`).

## Endpoint

- **URL:** `POST /api/integrations/health/apple/import` (producción: `https://orvita.app/api/integrations/health/apple/import`).
- **Cuerpo:** JSON con al menos una métrica numérica; suele incluir `observed_at` (fecha del día, p. ej. `yyyy-MM-dd`). El atajo generado envía **`{ "apple_bundle": { … } }`**: un **Diccionario** con las métricas se guarda en la variable `apple_bundle` y el POST tiene una sola clave `apple_bundle` con ese valor (el servidor también acepta cuerpo plano con las mismas claves en la raíz o `entries`).

### Cabeceras recomendadas (Atajo)

| Cabecera | Obligatoriedad | Descripción |
|----------|----------------|-------------|
| `Content-Type` | Sí | `application/json` |
| `Authorization: Bearer <access_token>` | Alternativa | Sesión Supabase (misma que la web). |
| `x-orvita-import-token` **o** `import_token` en JSON | Alternativa | Token emitido por la app (flujo sin sesión en Shortcuts). |
| `x-orvita-observed-at` | Muy recomendada | Misma fecha que `observed_at` en el cuerpo; evita que Atajos serialice `null` en el JSON. |
| `x-orvita-client: orvita-ios-shortcut` | Recomendada | Marca el cliente; con sesión **Bearer** fuerza tratamiento como atajo en origen. |
| `x-orvita-health-source: apple_health_shortcut` | Opcional | Equivalente a lo anterior para `health_metrics.source`. |

**Origen en base de datos (`health_metrics.source`):**

- `apple_health_shortcut` si: cabecera `x-orvita-health-source` / `x-orvita-client` válidas, cuerpo `source` / `import_channel`, **o** autenticación por `import_token`.
- `apple_health_export` en el resto de casos (p. ej. export web con Bearer sin cabeceras de atajo).

Respuesta JSON incluye `health_metrics_source` con el valor aplicado.

## Métricas que lee el atajo generado (`build-orvita-health-shortcut.py`)

Las métricas van en el **Diccionario** (variable `apple_bundle`) y el POST JSON tiene solo **`apple_bundle`** como objeto anidado. Incluye (entre otras) lecturas de Apple Health alineadas al contrato del API:

- Pasos, energía activa (kcal), **conteo de entrenos**, duración de entrenos (segundos → minutos en servidor).
- Sueño (suma en segundos → horas en servidor), HRV (ms), FC en reposo, minutos de ejercicio / estar de pie, distancia, VO2 máx., etc.
- `readiness_score` puede completarse en servidor a partir de señales si faltara en el cliente.

Claves JSON frecuentes del atajo: `observed_at`, `steps`, `active_energy_kcal`, `workouts_count`, `workouts_duration_seconds`, `sleep_duration_seconds`, `hrv_ms`, `resting_hr_bpm`, …

## Entrenos y «Acción desconocida» (iOS reciente)

En iPhone con iOS muy nuevo, las acciones antiguas **`Buscar entrenos`** (`is.workflow.actions.filter.workouts`) y **`Obtener detalles del entreno`** (`is.workflow.actions.properties.workout`) a menudo importan como **Acción desconocida** y rompen todo lo que viene después (conteo de entrenos, duración, diccionario y POST con **«0 elementos»** porque las variables ya no existen).

El generador por defecto ya **no** las usa: hace **Buscar muestras de salud** con tipo **Workouts** (misma acción que pasos/HRV) → **Contar** → **Obtener detalles de muestras de salud** (Duración) → **Calcular estadísticas** (suma) → variable `workouts_duration_seconds_num`, igual que la cadena de sueño.

- Si en tu Mac necesitas el plist **antiguo**:  
  `python3 scripts/build-orvita-health-shortcut.py --legacy-workout-actions`
- Tras regenerar, vuelve a firmar el `.shortcut` y reinstálalo en el iPhone (borra el atajo roto antes).
- En **Diccionario** y **Obtener contenido de URL**, cada valor debe mostrar la **pastilla azul** de la variable (`steps_num`, `workout_count`, etc.). Si ves **«0 elementos»** o JSON con valores `{}` vacíos, suele ser un **bug de serialización del plist**: cada clave del JSON debe llevar `WFItemType = 0` (texto/token con variable). Con `WFItemType = 1`, iOS interpreta un **subdiccionario vacío** («0 elementos»). El generador del repo ya usa `0` para todas las métricas; reinstala el `.shortcut` firmado desde Órvita.
- Si aun así falta la pastilla, toca la celda y vuelve a elegir la variable desde **Variables**, o reimporta el atajo.

Cabecera del token: debe ser exactamente **`x-orvita-import-token`** (no un nombre recortado tipo `x-orvita-imp…`); el valor debe ser la variable **`import_token`** (archivo iCloud o token pegado en modo legacy), no el placeholder «Texto».

## Errores y notificación en iOS

- Si el POST devuelve **4xx/5xx**, Atajos muestra el error y **no** ejecuta la notificación final.
- Tras **2xx**, el atajo muestra notificación: **«Datos de Apple Health importados a Órvita ✓»** (título «Órvita»).
- Para errores de negocio con HTTP 200 (no usado en este endpoint para fallos), conviene añadir en el atajo un bloque **Si** sobre el campo `success` del JSON; el plist generado no lo incluye para mantener el flujo simple.

## Integración en Órvita (app)

- **Contexto:** `buildOperationalContext` (`lib/operational/context.ts`) carga la última fila de `health_metrics`, `buildAppleOperationalInsights` y `buildStrategicCorrelatedInsights` (`lib/insights/buildStrategicDay.ts`) — p. ej. correlación sueño + HRV + pulso.
- **Energía / Palanca #1:** `energyPressureFromOperationalContext` (`lib/hoy/commandDerivation.ts`) refina la banda energética con Apple (p. ej. readiness baja vs check-in optimista) y se combina con comandos de **Capital**.
- **UI**
  - **Inicio** (`HomeV3`) y **Hoy** (`HoyCommandCenter`): `StrategicDayHero` (salud + capital) y en «Foco operativo» leyenda **Importado vía Atajo** cuando `latest.source === "apple_health_shortcut"`.
  - **Salud** (`/salud`, `SaludDashboardV3`): bloque **Import Atajo** (`AppleShortcutAnalyticsSection`) con sello de importación y timestamp.

## Regenerar y firmar el `.shortcut` (macOS)

```bash
python3 scripts/build-orvita-health-shortcut.py
cp scripts/shortcuts/orvita-importar-salud-hoy.shortcut.src.plist public/shortcuts/Orvita-Importar-Salud-Hoy.unsigned.shortcut
shortcuts sign -m anyone \
  -i public/shortcuts/Orvita-Importar-Salud-Hoy.unsigned.shortcut \
  -o public/shortcuts/Orvita-Importar-Salud-Hoy.shortcut
rm public/shortcuts/Orvita-Importar-Salud-Hoy.unsigned.shortcut
```

Puede aparecer ruido en consola (`debugDescription`); si el comando termina en **0**, el archivo de salida suele ser válido.

## Checklist de verificación

### Atajo (iPhone)

- [ ] Instalado desde `https://orvita.app/shortcuts/Orvita-Importar-Salud-Hoy.shortcut` o enlace iCloud configurado en `NEXT_PUBLIC_ORVITA_HEALTH_SHORTCUT_ICLOUD_URL`.
- [ ] Permisos de **Salud** concedidos a Atajos para pasos, sueño, HRV, energía, entrenos.
- [ ] `orvita_import_token.txt` en iCloud Drive (ruta que indica el atajo) **o** sesión con Bearer si adaptaste el flujo.
- [ ] Tras ejecutar: notificación «Datos de Apple Health importados a Órvita ✓».
- [ ] Si falla: leer mensaje del sistema / cuerpo de error (401 token, 400 `observed_at`, etc.).

### Backend

- [ ] `POST /api/integrations/health/apple/import` con payload válido devuelve `success: true` y `health_metrics_source` esperado (`apple_health_shortcut` con token o cabeceras de atajo).
- [ ] En Supabase, fila en `health_metrics` con `source` correcto y `observed_at` del día.
- [ ] `integration_connections` fila `apple_health_export` actualizada (`metadata.last_health_metrics_source` refleja el último origen de fila).

### UI

- [ ] `/salud`: sección «Import Atajo» y sello **Importado vía Atajo** si aplica.
- [ ] Inicio: hero de salud/capital y leyenda de atajo en «Energía» cuando el último import es atajo.
- [ ] Hoy: mismo hero con correlación sueño / HRV cuando hay datos.

### Contexto operativo

- [ ] `GET /api/context` (o app con sesión) incluye `apple_health` con valores recientes y `insights` con líneas estratégicas al inicio.
- [ ] Comando del día / presión energética coherente con readiness y check-in (sin sustituir el check-in).

---

Más contexto histórico: `public/shortcuts/ATALJO-Salud-instrucciones.txt`, `docs/ios-shortcut-health-import.md`.
