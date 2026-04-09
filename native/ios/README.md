# Órvita — shell iOS (WKWebView)

Código base para un contenedor nativo mínimo que abre la web en pantalla completa y admite deep links `orvita://`.

## Requisitos

- Xcode 15+ (iOS 17+ recomendado)
- Cuenta de Apple Developer para TestFlight (opcional)

## Crear el proyecto en Xcode

1. **File → New → Project → App** (iOS).
2. Nombre: `OrvitaMobile`, Interface: **SwiftUI**, Language: **Swift**.
3. Arrastra los archivos de `native/ios/OrvitaMobile/*.swift` al target y marca **Copy items if needed** y el target `OrvitaMobile`.

## URL base (producción / preview)

En el target → **Info** → añade clave personalizada:

| Key | Type | Value |
|-----|------|--------|
| `ORVITA_WEB_URL` | String | `https://orvita.app` o tu URL de Vercel |

Si no existe, el código usa `https://orvita.app` por defecto (`Config.swift`).

## URL scheme (deep links)

1. Target → **Info** → **URL Types** → **+**
2. **URL Schemes**: `orvita`
3. **Identifier**: `app.orvita.mobile`

### URLs soportadas

| Abrir | URL |
|--------|-----|
| Inicio | `orvita://home` |
| Check-in mañana | `orvita://checkin/manana` |
| Check-in día | `orvita://checkin/dia` |
| Check-in noche | `orvita://checkin/noche` |

Prueba en Safari en el simulador: `orvita://checkin/dia` (debe abrir la app si está instalada).

## API para WidgetKit (siguiente paso)

`GET /api/mobile/widget-summary` con header `Authorization: Bearer <access_token>`.

Respuesta incluye contadores compactos y `deepLinks` relativos; concatena con `webBaseUrl` en el widget.

## Notas

- La sesión Supabase vive en el `WKWebView` (cookies / almacenamiento del dominio). El usuario inicia sesión una vez en la web dentro del shell.
- Un **widget nativo** real requiere extensión **WidgetKit** en el mismo proyecto; este repo solo entrega el shell y el endpoint de datos.
