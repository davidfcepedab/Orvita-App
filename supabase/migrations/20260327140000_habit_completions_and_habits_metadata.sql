-- Bloque 2 — Hábitos: historial diario de completados + metadata en operational_habits.
-- Additive only. RLS para habit_completions se añadirá en una migración posterior tras validación.

create table if not exists public.habit_completions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  habit_id uuid not null references public.operational_habits (id) on delete cascade,
  completed_on date not null,
  notes text
);

create unique index if not exists habit_completions_habit_id_completed_on_uidx
  on public.habit_completions (habit_id, completed_on);

create index if not exists habit_completions_user_id_completed_on_idx
  on public.habit_completions (user_id, completed_on desc);

comment on table public.habit_completions is
  'Registro por día de hábito completado (additive). Una fila por hábito y fecha.';

comment on column public.habit_completions.user_id is
  'Usuario propietario del completion (alineado con operational_habits.user_id).';

comment on column public.habit_completions.habit_id is
  'Referencia al hábito en operational_habits.';

comment on column public.habit_completions.completed_on is
  'Día calendario (UTC) en que se marcó el hábito como hecho.';

comment on column public.habit_completions.notes is
  'Nota opcional asociada a ese día (additive).';

alter table public.operational_habits
  add column if not exists metadata jsonb not null default '{}'::jsonb;

comment on column public.operational_habits.metadata is
  'Configuración additive: frecuencia, weekday_mask, is_superhabit, etc. (jsonb).';

-- ── ÓRBITA V3 – BLOQUE 2 HÁBITOS ──
-- [ ] Tabla habit_completions creada (additive)
-- [ ] Streaks y métricas 30d calculadas desde datos reales
-- [ ] Botón “hecho hoy” persiste correctamente
-- [ ] Compatible con SUPABASE_ENABLED y modo mock
-- [ ] Fidelidad visual y navegación preservada
