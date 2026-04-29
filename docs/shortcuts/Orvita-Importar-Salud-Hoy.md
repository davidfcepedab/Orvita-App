# Atajo **Orvita-Importar-Salud-Hoy** (Apple Health → Órvita)

Flujo canónico: el iPhone lee métricas de **Salud** (y entrenos), arma un JSON y hace **POST** a Órvita. El servidor valida la sesión o el **token de importación**, persiste en `health_metrics` con `source = apple_health_shortcut` (cuando el origen es el atajo; ver abajo), y el contexto operativo (`/api/context`) mezcla esas señales con check-ins y **Capital** (Palanca #1).

## Artefactos en el repo

| Artefacto | Uso |
|-----------|-----|
| `public/shortcuts/Orvita-Importar-Salud-Hoy.shortcut` | Descarga / instalación (`shortcuts://import-shortcut?url=…`). Firmado en macOS con `shortcuts sign`. |
| `public/shortcuts/Orvita-Salud-Historial-15Dias.shortcut` | Segundo atajo (mismo flujo que el diario, otro nombre; ver comentario en el plist). Generado con `--variant historial-15d`. |
| `scripts/shortcuts/orvita-importar-salud-hoy.shortcut.src.plist` | Plist fuente (también regenerable). |
| `scripts/shortcuts/orvita-salud-historial-15dias.src.plist` | Plist del segundo atajo (`--variant historial-15d`). |
| `scripts/build-orvita-health-shortcut.py` | Genera plist(es): `python3 scripts/build-orvita-health-shortcut.py` y `… --variant historial-15d`. |

Nombre exacto en la biblioteca de Atajos: **Orvita-Importar-Salud-Hoy** (debe coincidir con `ORVITA_HEALTH_SHORTCUT_NAME` en `lib/shortcuts/orvitaHealthShortcut.ts`). El histórico usa **Orvita-Salud-Historial-15Dias** (`ORVITA_HEALTH_HISTORIAL15_SHORTCUT_NAME`).

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
| `x-orvita-client: orvita-ios-shortcut` | Sí (plist generado) | Marca el cliente; con sesión **Bearer** fuerza tratamiento como atajo en origen. |
| `x-orvita-health-source: apple_health_shortcut` | Sí (plist generado) | Refuerzo para `health_metrics.source` = atajo. |

**Origen en base de datos (`health_metrics.source`):**

- `apple_health_shortcut` si: cabecera `x-orvita-health-source` / `x-orvita-client` válidas, cuerpo `source` / `import_channel`, **o** autenticación por `import_token`.
- `apple_health_export` en el resto de casos (p. ej. export web con Bearer sin cabeceras de atajo).

Respuesta JSON incluye `health_metrics_source` con el valor aplicado.

### `syncedAt` en la respuesta (no es el día de salud)

La respuesta incluye **`syncedAt`**: instante en que el servidor guardó el import (suele ser “ya de noche” en UTC y puede caer en **fecha distinta** a `observed_at`). Sirve para auditoría / “última sync”; **no** sustituye a `observed_at` ni al diccionario `normalized.observed_at` (día de las métricas).

- En el atajo: **no** reenvíes el JSON completo de la respuesta como cuerpo del siguiente POST (p. ej. fusionar respuesta + bundle). Si eso ocurre, el servidor **ignora** claves de eco (`syncedAt`, `success`, `normalized`, …) para no mezclarlas con métricas.
- Si necesitas encadenar acciones, construye el POST solo con **`apple_bundle`** (o el cuerpo plano de métricas) + `observed_at`; copia a mano campos concretos, no el objeto respuesta entero.

## Métricas que lee el atajo generado (`build-orvita-health-shortcut.py`)

Las métricas van en el **Diccionario** (variable `apple_bundle`) y el POST JSON tiene solo **`apple_bundle`** como objeto anidado. Incluye (entre otras) lecturas de Apple Health alineadas al contrato del API:

- Pasos, energía activa (kcal), **conteo de entrenos**, duración de entrenos (segundos → minutos en servidor).
- Sueño (suma en segundos → horas en servidor **solo muestras con inicio = hoy**; el servidor además capa a 24 h por día), HRV (ms), FC en reposo, minutos de ejercicio / estar de pie, distancia, VO2 máx., etc.
- `readiness_score` puede completarse en servidor a partir de señales si faltara en el cliente.

Claves JSON frecuentes del atajo: `observed_at`, `steps`, `active_energy_kcal`, `workouts_count`, `workouts_duration_seconds`, `sleep_duration_seconds`, `hrv_ms`, `resting_hr_bpm`, …

## Entrenos y «Acción desconocida» (iOS reciente)

En iPhone con iOS muy nuevo, las acciones antiguas **`Buscar entrenos`** (`is.workflow.actions.filter.workouts`) y **`Obtener detalles del entreno`** (`is.workflow.actions.properties.workout`) a menudo importan como **Acción desconocida** y rompen todo lo que viene después (conteo de entrenos, duración, diccionario y POST con **«0 elementos»** porque las variables ya no existen).

El generador por defecto ya **no** las usa: hace **Buscar muestras de salud** con tipo **Workouts** (misma acción que pasos/HRV) → **Contar** → **Obtener detalles de muestras de salud** (Duración) → **Calcular estadísticas** (suma) → variable `workouts_duration_seconds_num`, igual que la cadena de sueño.

- Si en tu Mac necesitas el plist **antiguo**:  
  `python3 scripts/build-orvita-health-shortcut.py --legacy-workout-actions`
- Tras regenerar, vuelve a firmar el `.shortcut` y reinstálalo en el iPhone (borra el atajo roto antes).
- En **Diccionario** y **Obtener contenido de URL**, cada valor debe mostrar la **pastilla azul** de la variable (`steps_num`, `workouts_count_num`, `workouts_duration_seconds_num`, etc.). Si ves **«0 elementos»** o JSON con valores `{}` vacíos, suele ser un **bug de serialización del plist**: cada clave del JSON debe llevar `WFItemType = 0` (texto/token con variable). Con `WFItemType = 1`, iOS interpreta un **subdiccionario vacío** («0 elementos»). El generador del repo ya usa `0` para todas las métricas; reinstala el `.shortcut` firmado desde Órvita.
- Si aun así falta la pastilla, toca la celda y vuelve a elegir la variable desde **Variables**, o reimporta el atajo.

### Placeholder «Texto» gris, JSON con `""` y enlaces de instalación

Si en el diccionario o en **Obtener contenido de URL** los valores aparecen como **«Texto»** (gris) y no como pastilla azul, Atajos está enviando **cadenas vacías**: el servidor y cualquier flujo que dependa del cuerpo (p. ej. compartir / reimportar el atajo) verán **todo sin valor**. No basta con repetir los **nombres** de las claves JSON en la columna de valor: hay que enlazar la **salida de una acción anterior** o una **variable** creada con **Establecer variable** (como en el `.shortcut` generado). Un atajo duplicado a mano («Orvita-Importar-Salud-Hoy 2») suele quedar así hasta que vuelvas a insertar cada variable.

**No duplicar el atajo en Atajos:** al tocar **Duplicar** en la biblioteca, iOS a menudo genera un atajo nuevo (nombre con «2», «3»…) cuyo **Diccionario conserva las claves pero pierde el enlace a variables**; parece que «llegó sin diccionario» aunque el bloque exista. La solución es **borrar esa copia** e **instalar de nuevo** el `.shortcut` desde `orvita.app` (o el enlace de la app), no reutilizar la duplicada.

**El `.shortcut` del repositorio está completo:** el generador serializa cada valor del Diccionario (y cabeceras HTTP del POST) como **`WFTextTokenAttachment`** con `Type = Variable` y `VariableName = …` — formato que iOS importa con pastillas. Una forma antigua (`WFTextTokenString` + `attachmentsByRange`) podía mostrar «Texto» vacío tras importar. Los tests en `__tests__/scripts/orvitaHealthShortcutPlist.contract.test.ts` comprueban tokens tras cada build. Si en el iPhone solo ves «Texto» gris, suele ser **copia duplicada** o un atajo distinto del instalado desde la web (nombre exacto **Orvita-Importar-Salud-Hoy**, sin sufijo).

### «No se encontraron muestras» en Workouts (tipo + inicio hoy)

Al **editar** el atajo y tocar **Buscar muestras de salud** (Workouts, inicio hoy), iOS muestra una vista previa. Si **no has registrado ningún entreno con fecha de inicio en el día civil actual**, el sistema puede mostrar *No se encontraron muestras* o sugerir permisos. Eso **no impide** que el atajo completo continúe: el conteo puede ser **0** y el POST envía `workouts_count: 0` (u omite el valor según el flujo). Si sí entrenaste hoy y sigue en 0, abre **Salud → Compartir → Atajos** y confirma lectura de **Entrenamientos**; luego reinstala el atajo desde Órvita (no la copia duplicada).

### Pastillas rojas en entrenos (workouts)

La **clave** del diccionario es la del contrato API (`workouts_count`, `workouts_duration_seconds`). El **valor** debe ser la variable numérica del flujo, **no** el mismo texto que la clave:

| Clave en el diccionario (JSON) | Variable que debe aparecer en la pastilla |
|--------------------------------|---------------------------------------------|
| `workouts_count` | `workouts_count_num` (salida de **Contar** sobre muestras tipo Workouts) |
| `workouts_duration_seconds` | `workouts_duration_seconds_num` (suma de duraciones + **Obtener números**) |

Si pones `workouts_duration_seconds` como valor, Atajos lo trata como texto o referencia rota → **pastilla roja** y valor vacío al ejecutar. Los permisos de Salud para Atajos pueden estar bien (como en tu captura); el fallo entonces es de **cableado** o de un paso previo roto (**Acción desconocida** tras un plist antiguo).

**Demo con «Entrenamiento»:** mostrar `[Entrenamiento]` en un aviso prueba que el objeto **Workout** existe; eso no reemplaza el flujo del atajo Órvita, que necesita **conteo** y **suma de duraciones** vía muestras de salud. Si en **Filtrar [Entrenamiento]** el tipo queda en **Pasos** u otra categoría que no son entrenos, el filtro no devuelve entrenos aunque otros atajos lean pasos bien.

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
