-- Preferencias de notificaciones push / email y deduplicación de crons.

create table if not exists public.orbita_notification_preferences (
  user_id uuid primary key references auth.users (id) on delete cascade,
  push_enabled_global boolean not null default true,
  push_checkin_reminder boolean not null default true,
  push_habit_reminder boolean not null default true,
  push_commitment_reminder boolean not null default true,
  push_finance_threshold boolean not null default true,
  push_agenda_upcoming boolean not null default false,
  push_training_reminder boolean not null default false,
  push_digest_morning boolean not null default false,
  push_weekly_summary boolean not null default false,
  push_partner_activity boolean not null default false,
  -- Si ahorro (neto/ingresos) del mes < este %, aviso (null = desactivado).
  finance_savings_threshold_pct numeric,
  reminder_hour_local smallint not null default 21 check (reminder_hour_local >= 0 and reminder_hour_local <= 23),
  digest_hour_local smallint not null default 8 check (digest_hour_local >= 0 and digest_hour_local <= 23),
  -- 0 = domingo … 6 = sábado
  weekly_digest_dow smallint not null default 0 check (weekly_digest_dow >= 0 and weekly_digest_dow <= 6),
  timezone text not null default 'America/Bogota',
  quiet_hours_start smallint check (quiet_hours_start is null or (quiet_hours_start >= 0 and quiet_hours_start <= 23)),
  quiet_hours_end smallint check (quiet_hours_end is null or (quiet_hours_end >= 0 and quiet_hours_end <= 23)),
  email_digest_enabled boolean not null default false,
  email_weekly_enabled boolean not null default false,
  updated_at timestamptz not null default now()
);

create index if not exists orbita_notification_preferences_updated_idx
  on public.orbita_notification_preferences (updated_at desc);

comment on table public.orbita_notification_preferences is
  'Preferencias de push/email; filas opcionales — la app fusiona defaults si no existe.';

alter table public.orbita_notification_preferences enable row level security;

drop policy if exists "orbita notification prefs select own" on public.orbita_notification_preferences;
drop policy if exists "orbita notification prefs insert own" on public.orbita_notification_preferences;
drop policy if exists "orbita notification prefs update own" on public.orbita_notification_preferences;

create policy "orbita notification prefs select own"
on public.orbita_notification_preferences for select
using (auth.uid() = user_id);

create policy "orbita notification prefs insert own"
on public.orbita_notification_preferences for insert
with check (auth.uid() = user_id);

create policy "orbita notification prefs update own"
on public.orbita_notification_preferences for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

-- Dedupe: solo el service_role debe escribir (sin políticas = usuarios no ven la tabla).
create table if not exists public.orbita_cron_notification_sent (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  job text not null,
  scope_date date not null,
  created_at timestamptz not null default now(),
  unique (user_id, job, scope_date)
);

create index if not exists orbita_cron_sent_user_job_idx
  on public.orbita_cron_notification_sent (user_id, job, scope_date desc);

alter table public.orbita_cron_notification_sent enable row level security;
-- Sin políticas: nadie con anon/authenticated JWT; service_role bypass.
