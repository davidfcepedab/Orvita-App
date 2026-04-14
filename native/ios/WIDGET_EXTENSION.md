# WidgetKit (Xcode) ↔ backend Órvita

Este documento alinea el **proyecto iOS** (p. ej. `Orvita-Apple/OrvitaMobile` en tu Mac) con lo que **sí está implementado** en este repositorio (Next.js / Vercel).

## Flujo de datos reales

1. **App (WKWebView)** — en este repo, `AppleShell/OrvitaWebView.swift` inyecta JS que lee el token de Supabase en `localStorage` (`sb-*-auth-token`) y lo envía al nativo vía `WKScriptMessageHandler` (`orvitaAuth`). Tras cada carga de página se vuelve a sincronizar (`didFinish`) para SPAs (Next.js).
2. **`OrvitaWidgetSessionStore`** escribe en el App Group **`group.app.orvita.mobile`** un JSON (`Library/Application Support/Orvita/widget_session.json`) con:
   - `accessToken`
   - `apiBaseURL` (origen de la web, p. ej. `https://orvita.app` o preview Vercel)
3. La **extensión de widget** lee ese archivo con **`OrvitaAppGroupSessionStore`** y llama:
   - `GET {apiBaseURL}/api/mobile/widget-summary`
   - Header: **`Authorization: Bearer <access_token>`**

Sin token en el App Group → el provider muestra “Conecta en Órvita” (`needsAuth`). Con token válido → respuesta JSON con contadores reales (Supabase).

## Comportamiento del servidor (Vercel)

- **`NEXT_PUBLIC_APP_MODE=mock`**: si la petición **no** lleva Bearer, la API puede devolver números de **demostración**. Si lleva **Bearer válido**, se usan **datos reales** (misma regla que en `/api/orbita/home`).
- Producción recomendada: **no** fijar `NEXT_PUBLIC_APP_MODE=mock` salvo entornos de demo explícitos.

## APIs en este repo

| Ruta (relativa a `apiBaseURL`) | Estado en este monorepo |
|--------------------------------|-------------------------|
| `api/mobile/widget-summary`    | **Implementada** (`app/api/mobile/widget-summary/route.ts`) |
| `api/mobile/widget-levers`     | No implementada aquí |
| `api/mobile/widget-activities` | No implementada aquí |
| `api/mobile/widget-reminders`  | No implementada aquí |
| `api/mobile/widget-routine-habits` | No implementada aquí |
| `api/mobile/widget-pending-today` | No implementada aquí |

Los tipos esperados por iOS están definidos en tu **`OrvitaWidgetCore.swift`** (`OrvitaLeversAPIResponse`, `OrvitaActivitiesAPIResponse`, etc.). Hasta que existan rutas equivalentes en el backend, esos widgets mostrarán error HTTP / “JSON” en la UI.

## Contrato `widget-summary` (Swift)

El cliente decodifica `WidgetSummaryResponse` → `WidgetSummaryData`. Campos que envía el servidor:

- `success`, `data`
- `data.generatedAt` (ISO-8601)
- `data.webBaseUrl` (string URL)
- `data.operationalOpenTasks`, `habitsDone`, `habitsTotal`
- `data.nextActionTitle` (nullable)
- `data.deepLinks.home`, `data.deepLinks.checkin.{manana,dia,noche}`

`checkinPhaseCounts` en Swift es **opcional**; si no viene, no rompe el decode.

## Checklist si “solo veo mock” o falla

1. **App Group** activo en el **target de la app principal** y en la **extensión** (`group.app.orvita.mobile`). Sin App Group, `OrvitaWidgetSessionStore` no puede escribir (en DEBUG verás un log en consola).
2. Incluye en el target Xcode **`OrvitaWidgetSessionStore.swift`** junto al resto de `AppleShell/`.
3. Tras login en la web dentro de la app, comprobar que existe `widget_session.json` con `accessToken` no vacío (Finder / consola de depuración).
4. **`apiBaseURL`** apunta al mismo origen donde desplegaste este repo (preview vs producción).
5. **Desplegar** la última `main` que incluye el fix de Bearer en modo mock.

## Dónde vive el código Swift

El target **WidgetKit** (`orvitamobilewidget`) suele vivir en tu proyecto Xcode local. En este repo, **`OrvitaMobile/AppleShell/`** incluye el shell web **y** el puente `orvitaAuth` → App Group; cópialo al proyecto y añade los `.swift` al target de la app.
