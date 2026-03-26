# Changelog

## [v1.1.0] — Orvita Core Expansion
### Added
- Operational data layer with Supabase migrations and Row Level Security (RLS).
- Typed API routes for context, tasks, habits, and check-ins.
- Operational dashboard and unified context builder.
- Domain types, validators, and mappers with Jest tests.
- Supabase migration scripts and governance documentation.

### Changed
- Hardened RLS policies for `orbita_agenda_tasks` and `users`.
- Updated operational UI components to use typed API contracts.

### Security
- Enforced per-user data isolation using Supabase RLS.
- API routes now require `Authorization: Bearer <supabase_access_token>`.

## v1.0.0
- Finanzas v1 stable baseline.
