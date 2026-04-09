-- Orvita Home: persistence for alert/smart-action states

create table if not exists public.orbita_home_alert_states (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  alert_id text not null,
  status text not null default 'active' check (status in ('active', 'resolved', 'dismissed')),
  last_action text not null default 'none' check (last_action in ('none', 'one_click', 'ai_resolve', 'dismiss')),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (user_id, alert_id)
);

create table if not exists public.orbita_home_smart_action_states (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  smart_action_id text not null,
  status text not null default 'active' check (status in ('active', 'done', 'scheduled', 'ignored')),
  last_action text not null default 'none' check (last_action in ('none', 'execute', 'schedule', 'ignore')),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (user_id, smart_action_id)
);

alter table public.orbita_home_alert_states enable row level security;
alter table public.orbita_home_smart_action_states enable row level security;

drop policy if exists "home alert states select own" on public.orbita_home_alert_states;
drop policy if exists "home alert states insert own" on public.orbita_home_alert_states;
drop policy if exists "home alert states update own" on public.orbita_home_alert_states;
drop policy if exists "home alert states delete own" on public.orbita_home_alert_states;

create policy "home alert states select own"
on public.orbita_home_alert_states
for select
using (auth.uid() = user_id);

create policy "home alert states insert own"
on public.orbita_home_alert_states
for insert
with check (auth.uid() = user_id);

create policy "home alert states update own"
on public.orbita_home_alert_states
for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "home alert states delete own"
on public.orbita_home_alert_states
for delete
using (auth.uid() = user_id);

drop policy if exists "home smart states select own" on public.orbita_home_smart_action_states;
drop policy if exists "home smart states insert own" on public.orbita_home_smart_action_states;
drop policy if exists "home smart states update own" on public.orbita_home_smart_action_states;
drop policy if exists "home smart states delete own" on public.orbita_home_smart_action_states;

create policy "home smart states select own"
on public.orbita_home_smart_action_states
for select
using (auth.uid() = user_id);

create policy "home smart states insert own"
on public.orbita_home_smart_action_states
for insert
with check (auth.uid() = user_id);

create policy "home smart states update own"
on public.orbita_home_smart_action_states
for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "home smart states delete own"
on public.orbita_home_smart_action_states
for delete
using (auth.uid() = user_id);

