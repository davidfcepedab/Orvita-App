# Notificaciones in-app y Web Push (Órvita)

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
# Público (cliente): clave VAPID (misma pareja que la privada)
NEXT_PUBLIC_VAPID_PUBLIC_KEY=

# Servidor: clave privada VAPID y contacto (RFC 8292)
VAPID_PRIVATE_KEY=
VAPID_SUBJECT=mailto:tu-correo@dominio.com

# Ya usada en otras rutas; obligatoria para registrar push (upsert por endpoint)
SUPABASE_SERVICE_ROLE_KEY=
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

## Dónde enganchar alertas (prioridad sugerida)

| Área | Idea de evento | Dónde llamar `createNotificationForUser` |
|------|----------------|------------------------------------------|
| Capital / finanzas | Umbral de flujo, tarjeta próxima a cierre, burn de suscripciones | Tras cálculo en APIs de overview/pl o en job programado |
| Hábitos | Racha en riesgo, bloque sin completar | `POST` completar hábito / cron diario |
| Agenda | Tarea en ventana corta, asignación pendiente | `app/api/agenda` o sync Google |
| Check-in | Recordatorio nocturno si falta registro | Cron existente en `vercel.json` + condición por usuario |
| Decisión / KPI | Brecha vs objetivo, compromiso vencido | Motor de home (`orbita/home`) o tabla de compromisos |
| Entrenamiento | Sesión planificada sin registro | Preferencias + recordatorio |

Cada llamada debe ejecutarse en **servidor** con `SUPABASE_SERVICE_ROLE_KEY` disponible (misma forma que otras tareas administrativas).

## Producción

- HTTPS obligatorio para push (excepto `localhost`).
- **Safari iOS**: el usuario debe añadir la web a la pantalla de inicio para Web Push (ver WebKit arriba).
- Rotación de VAPID: generar nuevo par, desplegar, usuarios pueden volver a pulsar “Activar push en este dispositivo”.
