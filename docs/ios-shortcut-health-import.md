# Importación de Apple Health desde Atajos (iOS) → RESET OS / Órvita

El envío puede automatizarse cada día; el **token de importación** en cabecera `x-orvita-import-token` es **persistente en Órvita** (no caduca por tiempo). En el **iPhone**, el atajo generado guarda el valor **una sola vez** en un archivo de **iCloud Drive** (`Shortcuts/orvita_import_token.txt`) y en las siguientes ejecuciones lo lee sin volver a preguntar, salvo que borres ese archivo o uses el modo legacy del generador.

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
  - **`x-orvita-import-token: <token persistente>`** — se genera **una vez** en **Configuración** (bloque Atajo / token de importación); el servidor guarda solo el hash (SHA-256). No caduca por tiempo; si **regeneras** o **revocas** en la web, deja de valer: en el iPhone borra o actualiza `iCloud Drive/Shortcuts/orvita_import_token.txt` (o vuelve a pegar el token cuando el atajo lo pida).
- Alias soportado (compatibilidad): `x-reset-token: <mismo token>` que enviarías en `x-orvita-import-token`.
- **`x-orvita-observed-at: yyyy-MM-dd`** (recomendada en Atajos): si el cuerpo JSON serializa `observed_at` como `null`, el servidor toma la fecha de esta cabecera. El plist generado por `scripts/build-orvita-health-shortcut.py` la envía enlazada a la misma fecha que `apple_bundle.observed_at`. Alias: `x-observed-at`.

**No** incluyas el token en el cuerpo JSON a menos que uses el campo `import_token` documentado; no se registra el JSON completo en producción en logs de servidor.

## Token en el iPhone (archivo local en iCloud Drive)

Flujo que implementa el plist generado por `scripts/build-orvita-health-shortcut.py` (modo por defecto):

1. **Obtener archivo** desde **iCloud Drive**, ruta `Shortcuts/orvita_import_token.txt`, sin mostrar selector, con **«No mostrar error si no se encuentra»** (o equivalente) activado.
2. **Obtener texto de la entrada** (o la acción que convierta el archivo en texto).
3. **Contar** el resultado en **caracteres**.
4. **Si** el conteo es **mayor que 0**: el texto del archivo es el `import_token` → guárdalo en la variable de atajo `import_token` (acción **Establecer variable**).
5. **Si no** (archivo ausente o vacío): **Solicitar entrada** con el mensaje acordado → **Guardar archivo** en la misma ruta `Shortcuts/orvita_import_token.txt` (iCloud Drive, sobrescribir si existe) → **Establecer variable** `import_token` con lo que pegó el usuario.
6. **Obtener variable** `import_token` (salida usable como «Entrada proporcionada» / `Provided Input` para enlazar al POST).
7. El paso **Obtener contenido de URL** (POST) debe llevar la cabecera **`x-orvita-import-token`** enlazada a esa variable (mismo valor que antes, sin poner el token en el JSON del cuerpo).

Requisitos: **iCloud Drive** activo; la primera vez iOS puede pedir permiso a Atajos para leer/escribir en esa ubicación. La carpeta `Shortcuts` debe existir bajo iCloud Drive (si no, créala en la app **Archivos** antes de la primera ejecución).

### Resetear el token en el iPhone

Si en Órvita **regeneras** o **revocas** el token:

- Borra en **Archivos → iCloud Drive → Shortcuts** el archivo **`orvita_import_token.txt`**, **o**
- Sustituye su contenido por el nuevo token (texto plano, una sola línea, sin comillas).

La próxima ejecución del atajo volverá a pedir el token (o leerá el archivo ya actualizado).

### Generador y `.shortcut` firmado

- Plist fuente (XML): `scripts/shortcuts/orvita-importar-salud-hoy.shortcut.src.plist` — regenerar con  
  `python3 scripts/build-orvita-health-shortcut.py`  
  (opciones habituales: `--mode minimal`, `--quantity-type plain`, etc.).
- Modo **solo pregunta en cada ejecución** (sin archivo), por compatibilidad o depuración:  
  `python3 scripts/build-orvita-health-shortcut.py --legacy-token-prompt`
- El binario **`public/shortcuts/Orvita-Importar-Salud-Hoy.shortcut`** no se regenera en el repo con el script solo: en macOS hace falta `plutil -convert binary1` y `shortcuts sign` (ver `public/shortcuts/ATALJO-Salud-instrucciones.txt`). Tras cambiar el plist, vuelve a firmar y publica el `.shortcut` o actualiza el enlace de iCloud.

## Editar el atajo manualmente (orden de acciones)

Si mantienes un atajo copiado o antiguo, puedes alinearlo al flujo anterior sin regenerar el plist:

1. Abre el atajo en **Atajos** → **Editar**.
2. **Al inicio** del flujo (antes de fecha / Salud / diccionario / POST), añade en este orden:
   1. **Obtener archivo** · Servicio: **iCloud Drive** · Desactiva **Mostrar selector de documentos** · Ruta: `Shortcuts/orvita_import_token.txt` · Activa **No mostrar error si no se encuentra** (si tu iOS lo ofrece).
   2. **Obtener texto de la entrada**.
   3. **Contar** · **Caracteres**.
   4. **Si** · «Resultado de Contar» **es mayor que** `0`:
      - Dentro del **Si**: **Establecer variable** · Nombre `import_token` · Valor: **Texto** de la acción «Obtener texto de la entrada» (o el nombre que muestre Atajos).
   5. **De lo contrario**:
      - **Solicitar entrada** · Texto · Mensaje: *«Pega tu token de Órvita»* (o el que prefieras).
      - **Guardar archivo** · iCloud Drive · **No preguntar dónde guardar** · Ruta `Shortcuts/orvita_import_token.txt` · Sobrescribir si existe · Entrada: resultado de **Solicitar entrada**.
      - **Establecer variable** · `import_token` · Valor: resultado de **Solicitar entrada**.
   6. **Fin Si**.
   7. **Obtener variable** · `import_token` (opcional: renombra la salida para que coincida con lo que ya enlazabas al POST, p. ej. «Entrada proporcionada»).
3. En **Obtener contenido de URL** (POST a `/api/integrations/health/apple/import`), en **Encabezados**, deja **`x-orvita-import-token`** enlazado a la variable **`import_token`** (o a la salida del **Obtener variable** del último paso del bloque anterior), no al texto fijo del token.
4. Comprueba que **`Content-Type: application/json`** y **`x-orvita-observed-at`** sigan como antes.

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
