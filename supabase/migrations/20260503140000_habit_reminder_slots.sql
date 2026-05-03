-- Hábitos: varios recordatorios al día + opción de bajar toques con racha.

alter table public.orbita_notification_preferences
  add column if not exists habit_reminder_slots smallint not null default 1
    check (habit_reminder_slots >= 1 and habit_reminder_slots <= 4);

alter table public.orbita_notification_preferences
  add column if not exists habit_reminder_auto_ease_on_streak boolean not null default true;

comment on column public.orbita_notification_preferences.habit_reminder_slots is
  'Cuántos toques diarios de recordatorio de hábitos (1–4), repartidos entre digest_hour_local y reminder_hour_local.';

comment on column public.orbita_notification_preferences.habit_reminder_auto_ease_on_streak is
  'Si true, baja toques efectivos cada 7 días de mejor racha actual (hasta 1 toque mínimo).';
