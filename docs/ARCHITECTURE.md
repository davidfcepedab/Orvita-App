# Orvita Architecture

## Producto: capa copiloto iOS (Órvita)

Especificación maestra unificada (widgets Home/Lock, Dynamic Island, push, Shortcuts, pareja, MVP y disciplina de notificaciones): **[ORVITA_IOS_COPILOT.md](./ORVITA_IOS_COPILOT.md)**.

## Overview
Orvita is a Next.js App Router application with a modular, domain-driven layout. Each domain (Finanzas, Salud, Fisico, Profesional) owns its UI, data contracts, and server routes. Shared operational logic lives in `lib/operational`.

## Core Layers
- UI: `app/` pages and `app/components/orbita-v3` components.
- API: `app/api/*` Next.js route handlers with strict typing and structured responses.
- Domain Logic: `lib/operational`, `lib/finanzas`.
- Finanzas (P&L estratégico, especificación declarativa): **[finanzas/PL_STRATEGIC_DASHBOARD.md](./finanzas/PL_STRATEGIC_DASHBOARD.md)**.
- Data Access: Supabase via `lib/supabase/server`.

## Data & Security
- Supabase schema is defined in `supabase/migrations`.
- Row Level Security (RLS) enforces per-user access.
- API routes require a Bearer token and use `requireUser` to resolve `auth.uid()`.
 - Operational data is stored in `operational_tasks`, `operational_habits`, and `checkins`.
 - Access is scoped by `user_id` and enforced through RLS policies.

## Operational Context Flow
1. Client requests `/api/context`.
2. Server fetches operational tasks, habits, and latest checkin for the user.
3. `buildOperationalContext` assembles the response for UI consumption.

## Operational Modules
- Tasks: CRUD via `/api/tasks`, domain-scoped (`salud`, `fisico`, `profesional`).
- Habits: CRUD via `/api/habits`, domain-scoped.
- Check-ins: Read/write via `/api/checkins` for global and per-domain scores.
- Context Builder: Aggregates tasks, habits, and latest checkin for the UI.

## Testing
- Unit tests live under `__tests__`.
- Operational validations and mappers are tested for contract correctness.
