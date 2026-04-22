-- Columnas explícitas para consultas y agregados rápidos (índices) frente a solo metadata jsonb.
-- La app sigue rellenando metadata para depuración; las columnas son la fuente preferente en lectura.

alter table public.health_metrics
  add column if not exists resting_hr_bpm integer,
  add column if not exists apple_workouts_count integer,
  add column if not exists apple_workout_minutes integer;

comment on column public.health_metrics.resting_hr_bpm is 'FC en reposo (lpm) desde import Apple / atajo; preferente sobre metadata';
comment on column public.health_metrics.apple_workouts_count is 'Sesiones de movimiento/entreno contadas por Apple en el día del import';
comment on column public.health_metrics.apple_workout_minutes is 'Minutos de entreno según Apple (derivado o directo)';

-- Backfill desde filas ya guardadas (jsonb)
update public.health_metrics
set
  resting_hr_bpm = (metadata->>'resting_hr_bpm')::integer
where
  resting_hr_bpm is null
  and metadata ? 'resting_hr_bpm'
  and (metadata->>'resting_hr_bpm') ~ '^[0-9]+$'
  and (metadata->>'resting_hr_bpm')::integer between 30 and 220;

update public.health_metrics
set
  apple_workouts_count = (metadata->>'apple_workouts_count')::integer
where
  apple_workouts_count is null
  and metadata ? 'apple_workouts_count'
  and (metadata->>'apple_workouts_count') ~ '^[0-9]+$'
  and (metadata->>'apple_workouts_count')::integer between 0 and 50;

update public.health_metrics
set
  apple_workout_minutes = least(
    1440,
    greatest(
      0,
      round((metadata->>'apple_workouts_duration_seconds')::numeric / 60.0)
    )
  )::integer
where
  apple_workout_minutes is null
  and metadata ? 'apple_workouts_duration_seconds'
  and (metadata->>'apple_workouts_duration_seconds') ~ '^[0-9.]+$'
  and (metadata->>'apple_workouts_duration_seconds')::numeric > 0;

update public.health_metrics
set
  apple_workout_minutes = (metadata->>'workouts_minutes')::integer
where
  apple_workout_minutes is null
  and metadata ? 'workouts_minutes'
  and (metadata->>'workouts_minutes') ~ '^[0-9]+$'
  and (metadata->>'workouts_minutes')::integer between 0 and 1440;

-- Consultas por usuario y ventana temporal (series, últimos N días con señal cardíaca)
create index if not exists idx_health_metrics_user_observed_resting
  on public.health_metrics (user_id, observed_at desc)
  where resting_hr_bpm is not null;

create index if not exists idx_health_metrics_user_observed_workouts
  on public.health_metrics (user_id, observed_at desc)
  where coalesce(apple_workouts_count, 0) > 0 or coalesce(apple_workout_minutes, 0) > 0;
