# Notificaciones in-app y Web Push (Órvita)

## UI (campana)

El panel se renderiza con **portal a `document.body`**: el `<header>` usa `backdrop-filter`, que crea un *containing block* y desplazaba los `position: fixed` calculados con coordenadas de viewport.

## Qué hay implementado

1. **Bandeja** (`orbita_notifications`): lista en el panel de la campana, no leídas con punto, “Marcar leídas”, clic navega y marca leída.
2. **API** (Bearer JWT Supabase):
   - `GET /api/notifications` — lista + `unreadCount`
   - `PATCH /api/notifications` — `{ markAllRead: true }` o `{ ids: string[] }`
   - `GET /api/notifications/preferences` — preferencias fusionadas con defaults (sin fila en BD = defaults)
   - `PATCH /api/notifications/preferences` — actualización parcial de toggles, horas locales, `timezone`, `finance_savings_threshold_pct`, flags de email digest
   - UI: pantalla **Configuración** (`/configuracion`) — sección «Notificaciones y alertas» (`ConfigNotificationPreferencesPanel`) carga y guarda vía esas rutas.
   - `POST /api/notifications/push/subscribe` — cuerpo `PushSubscription.toJSON()` (requiere VAPID + `SUPABASE_SERVICE_ROLE_KEY` en el servidor)
   - `DELETE /api/notifications/push/unsubscribe` — `{ endpoint }`
   - `POST /api/notifications/self-test` — crea una alerta de prueba y envía push si hay suscripción
3. **Service worker** `public/sw.js` — recibe push y muestra notificación nativa; al hacer clic abre la ruta en `data.url`.
4. **Servidor** `lib/notifications/createNotification.ts` — `createNotificationForUser({ userId, title, body, category, link })` inserta y dispara Web Push (service role).

Migraciones (aplicar con `supabase db push` o SQL en el dashboard):

- `20260415120000_orbita_notifications_and_push.sql` — bandeja + push subscriptions
- `20260416000000_orbita_notification_preferences.sql` — `orbita_notification_preferences`, dedupe `orbita_cron_notification_sent`

## Variables de entorno

```bash
# Público (cliente): clave VAPID (misma pareja que la privada; salida de generate-vapid-keys)
NEXT_PUBLIC_VAPID_PUBLIC_KEY=<public_key_base64url>

# Servidor: clave privada VAPID y contacto (RFC 8292)
VAPID_PRIVATE_KEY=<private_key_base64url>
VAPID_SUBJECT=mailto:tu-correo@dominio.com

# JWT service_role (Supabase → Project Settings → API). No subas valores reales al repo.
# En Vercel a menudo: SUPABASE_SECRET_KEY. El código acepta también SUPABASE_SERVICE_ROLE_KEY.
SUPABASE_SERVICE_ROLE_KEY=<service_role_jwt>
# SUPABASE_SECRET_KEY=<mismo_jwt_si_usas_nombre_Vercel>
```

**No pegues secretos reales en archivos del repositorio** (GitHub push protection). Rellena solo en Vercel / `.env.local`.

Cron y jobs (servidor):

```bash
# Protección de rutas /api/cron/* (una de las dos):
CRON_SECRET=<token_largo>
INTERNAL_API_TOKEN=<token_largo>
# Authorization: Bearer $CRON_SECRET  o  x-reset-token: $INTERNAL_API_TOKEN
```

Email opcional (digest por Resend):

```bash
RESEND_API_KEY=
EMAIL_FROM="Órvita <onboarding@resend.dev>"
```

Generar par VAPID:

```bash
npx web-push generate-vapid-keys
```

## Referencias (estándar web)

| Prioridad | Recurso | Enlace |
|-----------|---------|--------|
| 1 | Apple — Web Push en Safari | https://developer.apple.com/documentation/usernotifications/sending-web-push-notifications-in-web-apps-and-browsers |
| 2 | MDN — Push API | https://developer.mozilla.org/en-US/docs/Web/API/Push_API |
| 3 | MDN — Service Worker API | https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API |
| 4 | MDN — Notifications API | https://developer.mozilla.org/en-US/docs/Web/API/Notifications_API |
| 5 | RFC 8292 (VAPID) | https://datatracker.ietf.org/doc/html/rfc8292 |
| 6 | WebKit — Push en iOS/iPadOS (PWA en pantalla de inicio) | https://webkit.org/blog/13878/web-push-for-web-apps-on-ios-and-ipados/ |

## Cron y jobs automáticos

**Vercel** — `vercel.json` programa `GET /api/cron/notifications/dispatch` cada hora (sin query = `jobs=all`). La ruta usa `authorizeAutomationRequest` (`lib/auth/automationGuard.ts`): `Authorization: Bearer <CRON_SECRET>` o cabecera `x-reset-token: <INTERNAL_API_TOKEN>`. Vercel debe tener esos secretos y `SUPABASE_SERVICE_ROLE_KEY` (o `SUPABASE_SECRET_KEY`).

**Parámetro `jobs`** — Lista separada por comas o `all`:

`checkin`, `habits`, `commitments`, `finance`, `morning`, `weekly`, `agenda`, `training`, `partner`.

Ejemplo manual: `GET /api/cron/notifications/dispatch?jobs=checkin,habits`

**Compatibilidad** — `GET /api/cron/checkins/sync` reenvía internamente a `jobs=checkin` (misma autenticación).

**Implementación** — `lib/notifications/cron/runAllJobs.ts` recorre usuarios en `public.users`, carga preferencias y ejecuta cada job. Las notificaciones reales pasan por `createNotificationForUser` (`lib/notifications/createNotification.ts`). Dedupe en `orbita_cron_notification_sent` (service role).

### Email (Resend)

Si `email_digest_enabled` / `email_weekly_enabled` están activos y existe `RESEND_API_KEY`, los digest pueden enviar copia por correo (`lib/email/sendOrvitaEmail.ts`). El remitente por defecto se configura con `EMAIL_FROM`.

### Estado por tipo de job

| Job | Comportamiento |
|-----|----------------|
| `checkin` | Recordatorio en `reminder_hour_local` si no hay check-in del día (zona `timezone`). |
| `habits` | Mañana (`digest_hour_local`): hábitos programados hoy sin completar. |
| `commitments` | Compromisos del hogar próximos a vencer. |
| `finance` | Si `finance_savings_threshold_pct` no es null y el ahorro del mes está por debajo, aviso ~hora local 14 (dedupe mensual). |
| `morning` | Digest matutino (push + email opcional). |
| `weekly` | Resumen semanal (`weekly_digest_dow` + `digest_hour_local`; email opcional). |
| `agenda`, `training`, `partner` | **Stub** — devuelven sin enviar hasta integrar Google/agenda, preferencias de training y lógica de pareja. |

## Extensiones futuras (APIs y producto)

| Área | Idea | Notas |
|------|------|--------|
| Agenda / Google | Recordatorios por ventana | Conectar con sync existente; hoy el job `agenda` es stub. |
| Entrenamiento | Sesión sin registro | Job `training` pendiente de modelo de datos. |
| Pareja | Actividad compartida | Job `partner` pendiente de producto. |

Las llamadas server-side siguen requiriendo `SUPABASE_SERVICE_ROLE_KEY` en procesos con service client.

## Listado de push (producto — alineación con copiloto)

**Disciplina sugerida** (alineada con `ORVITA_IOS_COPILOT.md`): tratar el push como **capital escaso** — pocas interrupciones al día; el resto puede ir a **resumen en bandeja** sin push, o a digest horario. Evitar duplicar lo que ya cubre el email o el calendario del sistema.

### Fase A — Alto valor / encaja con datos ya en Órvita

| ID | Push | Disparador (evento o hora) | Enlace típico | Notas |
|----|------|---------------------------|---------------|-------|
| A1 | **Check-in: te falta cerrar el día** | Cron nocturno (ej. 21:30 local o UTC+regla) si no hay check-in del día | `/checkin` o `/hoy` | Requiere cron real + consulta check-ins por usuario |
| A2 | **Hábito en riesgo hoy** | Cron 1×/día: hábito programado para hoy y aún sin “hecho” (ventana configurable) | `/habitos` | Encajar con `habits` + metadata de frecuencia |
| A3 | **Recordatorio de decisión** | Fecha límite de decisión/compromiso en −48h / −24h / día D | `/decision` o ruta del ítem | Tabla/API de compromisos o decisiones |
| A4 | **Finanzas: umbral suave** | Tras import o cálculo: flujo neto del mes bajo X%, o gasto operativo vs ingresos | `/finanzas/overview` | Solo si el usuario activa umbrales en preferencias (evitar spam) |

### Fase B — Agenda, hogar y operación

| ID | Push | Disparador | Enlace típico | Notas |
|----|------|------------|---------------|-------|
| B1 | **Próximo bloque importante** | Evento Google/Órvita en ventana 30–60 min (opcional) | `/agenda` | Cuidado con duplicar Google Calendar |
| B2 | **Tarea asignada / pendiente hogar** | Invitación o tarea con due date hoy | `/agenda` o tarea | Depende de modelo de tareas hogar |
| B3 | **Entrenamiento: sesión planificada** | Día con sesión en preferencias y sin registro | `/training` | Opcional; muchos usuarios prefieren solo app |

### Fase C — Resúmenes y pareja (baja frecuencia)

| ID | Push | Disparador | Enlace típico | Notas |
|----|------|------------|---------------|-------|
| C1 | **Pulso / digest matutino** | 1×/día hora fija (ej. 8:00): una línea de Pulso + siguiente paso | `/inicio` o `/hoy` | Sustituye varios pings sueltos |
| C2 | **Cierre semanal** | Domingo hora fija: resumen breve semanal | `/inicio` | Alineado con widget “cierre” en copiloto |
| C3 | **Sincronía pareja** | Cambio en entidad compartida + reglas (ej. lista hogar) | ruta compartida | Requiere producto “pareja” estable |

### Fase D — Solo in-app (sin push) o digest

| ID | Canal | Motivo |
|----|--------|--------|
| D1 | Bandeja sin push | Micro-avisos frecuentes (cada gasto, cada hábito) |
| D2 | Email / informe | Reportes largos o listas |

### Preferencias de usuario

- Tabla **`orbita_notification_preferences`** (ver migración): toggles por tipo de push, `timezone`, `reminder_hour_local`, `digest_hour_local`, `weekly_digest_dow`, `quiet_hours_start` / `quiet_hours_end`, umbral `finance_savings_threshold_pct`, `email_digest_enabled` / `email_weekly_enabled`. La API `GET`/`PATCH` `/api/notifications/preferences` fusiona con defaults definidos en `lib/notifications/notificationPrefs.ts` si no hay fila.
- Posible evolución: categorías más finas (`metadata`) si el producto lo exige.

## Producción

- HTTPS obligatorio para push (excepto `localhost`).
- **Safari iOS**: el usuario debe añadir la web a la pantalla de inicio para Web Push (ver WebKit arriba).
- Rotación de VAPID: generar nuevo par, desplegar, usuarios pueden volver a pulsar “Activar push en este dispositivo”.
