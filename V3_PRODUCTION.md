# V3 Production Guide

This project runs on Next.js App Router and exposes canonical V3 modules with compatibility aliases from legacy layouts.

## Canonical V3 routes

- `/` -> HomeV3 module
- `/hoy` -> HoyV3 module
- `/agenda` -> AgendaV3 module
- `/habitos` -> HabitosV3 module
- `/configuracion` -> ConfigV3 module
- `/salud` -> Health operations dashboard
- `/finanzas/overview` -> Finance overview
- `/finanzas/categories` -> Finance categories
- `/finanzas/transactions` -> Finance transactions
- `/finanzas/insights` -> Finance insights
- `/profesional` -> Professional module
- `/sistema` -> System module
- `/checkin` -> Daily check-in

## Compatibility aliases

- `/config` -> redirects to `/configuracion`
- `/health` -> redirects to `/salud`
- `/training` -> redirects to `/salud`
- `/capital` -> redirects to `/finanzas/overview`
- `/decision` -> redirects to `/profesional`
- `/weekly` -> redirects to `/sistema`
- `/fisico` -> redirects to `/salud`
- `/finanzas` -> redirects to `/finanzas/overview`

## Production checklist

1. Set env vars:
   - `GOOGLE_CREDENTIALS` (single-line JSON or base64 JSON)
   - `CRON_SECRET` and/or `INTERNAL_API_TOKEN` for cron endpoint protection
2. Verify build:
   - `npm run build`
3. Verify runtime:
   - `npm run dev` and open canonical and alias routes.
4. Verify critical APIs:
   - `/api/context`
   - `/api/checkin`
   - `/api/finanzas/overview`
   - `/api/finanzas/categories`
   - `/api/finanzas/transactions`
   - `/api/finanzas/insights`
