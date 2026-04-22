# Atajo de iOS: “Órvita – Importar Salud Hoy”

Objetivo: que **Apple Health** alimente `health_metrics` en Supabase con **un toque**, y que Órvita sea la **única** pantalla de verdad para el día.

## Flujo recomendado (usuario)

1. **Instalar** el atajo desde la app (pantalla Salud) o abrir:
   - `https://<tu-dominio>/shortcuts/Orvita-Importar-Salud-Hoy.shortcut`  
   - En iPhone: se abre la app Atajos y permite **Añadir atajo**.

2. **Iniciar sesión** en Órvita (PWA o Safari) y, en **Salud**, tocar **Generar token** (o equivalente) para el import. El token es de corta duración y se pega en el atajo la primera vez o cuando caduca.

3. **Ejecutar** el atajo (widget, Siri o Atajos). El atajo debería:
   - Leer de HealthKit: **sueño** (últimas horas o ancla del día), **HRV**, **readiness** (si aplica vía cálculo/series exportadas en el diseño), **pasos**, **entrenos** (conteo y duración) y **energía activa (kcal)**.
   - `POST` a `POST /api/integrations/health/apple/import` con el cuerpo que ya espera el backend (ver `app/api/integrations/health/apple/import/route.ts` y ejemplo en la app).

4. **Abrir Órvita** → Inicio o Hoy: el **día estratégico** y los insights se actualizan con `buildOperationalContext` + `buildStrategicDay`.

## Qué debe hacer el atajo (técnico)

- Incluir **Authorization: Bearer** si el usuario pega un JWT, o el flujo con **import_token** que devuelve `POST /api/integrations/health/apple/import-token` (flujo de Salud en la PWA).
- Enviar `observed_at` en **ISO 8601** (hora local o UTC, consistente).
- Mapear entrenos a `metadata`: `apple_workouts_count`, `apple_workouts_duration_seconds` (como en `mapHealthMetricsRowToAppleSignals`).

## Buenas prácticas (HIG y confianza)

- **Wording** de confirmación: “Enviar a Órvita” (no “subir a la nube” genérico).
- Tras el envío: notificación local breve: “Salud de hoy en Órvita”.
- Frecuencia: 1–2 veces al día (mañana + noche) para no vaciar batería; el usuario mantiene el ritual.

## Archivo en el repo

- **Binario importable**: `public/shortcuts/Orvita-Importar-Salud-Hoy.shortcut`

Cada vez que cambies el contrato de la API de import, **regenera** el atajo en el Mac (Atajos.app → exportar) y reemplaza el `.shortcut` en `public/shortcuts/`.

## Verificación rápida

- [ ] Token válido: respuesta 200 del import.
- [ ] Fila en `health_metrics` para `user_id` correcto.
- [ ] Inicio / Hoy muestran el hero estratégico con datos (sin “sync obsoleto” si la muestra es reciente).
- [ ] Vercel sirve el `.shortcut` con `Content-Type` adecuado (revisar headers si el navegador no descarga).
