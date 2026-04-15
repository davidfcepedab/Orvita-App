# Notificaciones in-app y Web Push (Órvita)

## UI (campana)

El panel se renderiza con **portal a `document.body`**: el `<header>` usa `backdrop-filter`, que crea un *containing block* y desplazaba los `position: fixed` calculados con coordenadas de viewport.

## Qué hay implementado

1. **Bandeja** (`orbita_notifications`): lista en el panel de la campana, no leídas con punto, “Marcar leídas”, clic navega y marca leída.
2. **API** (Bearer JWT Supabase):
   - `GET /api/notifications` — lista + `unreadCount`
   - `PATCH /api/notifications` — `{ markAllRead: true }` o `{ ids: string[] }`
   - `POST /api/notifications/push/subscribe` — cuerpo `PushSubscription.toJSON()` (requiere VAPID + `SUPABASE_SERVICE_ROLE_KEY` en el servidor)
   - `DELETE /api/notifications/push/unsubscribe` — `{ endpoint }`
   - `POST /api/notifications/self-test` — crea una alerta de prueba y envía push si hay suscripción
3. **Service worker** `public/sw.js` — recibe push y muestra notificación nativa; al hacer clic abre la ruta en `data.url`.
4. **Servidor** `lib/notifications/createNotification.ts` — `createNotificationForUser({ userId, title, body, category, link })` inserta y dispara Web Push (service role).

Migración: `supabase/migrations/20260415120000_orbita_notifications_and_push.sql` (aplicar con `supabase db push` o SQL en el dashboard).

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

## Por qué «push activo» pero no llegan alertas solas

Esto es **esperado con el código actual**:

1. **Suscripción y canal** — Si «Activar push» y «Probar alerta» funcionan, VAPID, `sw.js` y `orbita_push_subscriptions` están bien.
2. **No hay disparadores automáticos conectados** — La función `createNotificationForUser` en `lib/notifications/createNotification.ts` **inserta en bandeja y llama a `sendWebPushToUser`**, pero **ninguna ruta API ni cron del repositorio la importa todavía**. Solo el flujo manual **`POST /api/notifications/self-test`** crea fila + push.
3. **La tabla de abajo es hoja de ruta (producto)**, no implementación: hay que añadir llamadas desde APIs o jobs cuando defináis reglas (umbral, hábito, recordatorio, etc.).

**Cron en Vercel** — `vercel.json` programa `GET /api/cron/checkins/sync` cada hora. En este repo **no existe** la carpeta `app/api/cron/`; ese path respondería 404 hasta que exista la ruta (y envíe notificaciones solo si la implementáis ahí con `createNotificationForUser` o lógica equivalente).

## Dónde enganchar alertas (prioridad sugerida — pendiente de código)

| Área | Idea de evento | Dónde llamar `createNotificationForUser` |
|------|----------------|------------------------------------------|
| Capital / finanzas | Umbral de flujo, tarjeta próxima a cierre, burn de suscripciones | Tras cálculo en APIs de overview/pl o en job programado |
| Hábitos | Racha en riesgo, bloque sin completar | `POST` completar hábito / cron diario |
| Agenda | Tarea en ventana corta, asignación pendiente | `app/api/agenda` o sync Google |
| Check-in | Recordatorio nocturno si falta registro | **Crear** `app/api/cron/...` protegido con `CRON_SECRET` + `authorizeAutomationRequest` (`lib/auth/automationGuard.ts`) |
| Decisión / KPI | Brecha vs objetivo, compromiso vencido | Motor de home (`orbita/home`) o tabla de compromisos |
| Entrenamiento | Sesión planificada sin registro | Preferencias + recordatorio |

Cada llamada debe ejecutarse en **servidor** con `SUPABASE_SERVICE_ROLE_KEY` disponible (misma forma que otras tareas administrativas).

## Listado de push a activar (propuesta de producto)

**Estado:** ninguno de los siguientes está cableado a `createNotificationForUser` todavía; sirve como backlog para implementar por fases.

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

### Preferencias de usuario (recomendado antes de escalar push)

- Granularidad por **categoría** (`system`, `finance`, `habits`, `agenda`, `checkin`, etc.) y tabla `metadata` o `user_notification_settings` futura.
- Horario **quiet** (no push entre X–Y salvo categoría `critical`).

## Producción

- HTTPS obligatorio para push (excepto `localhost`).
- **Safari iOS**: el usuario debe añadir la web a la pantalla de inicio para Web Push (ver WebKit arriba).
- Rotación de VAPID: generar nuevo par, desplegar, usuarios pueden volver a pulsar “Activar push en este dispositivo”.
