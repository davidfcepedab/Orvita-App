-- Bandeja in-app + suscripciones Web Push (VAPID) por usuario.

create table if not exists public.orbita_notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  title text not null,
  body text not null,
  category text not null default 'system',
  link text,
  read_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists orbita_notifications_user_created_idx
  on public.orbita_notifications (user_id, created_at desc);

create index if not exists orbita_notifications_user_unread_idx
  on public.orbita_notifications (user_id)
  where read_at is null;

alter table public.orbita_notifications enable row level security;

drop policy if exists "orbita notifications select own" on public.orbita_notifications;
drop policy if exists "orbita notifications insert own" on public.orbita_notifications;
drop policy if exists "orbita notifications update own" on public.orbita_notifications;
drop policy if exists "orbita notifications delete own" on public.orbita_notifications;

create policy "orbita notifications select own"
on public.orbita_notifications for select
using (auth.uid() = user_id);

create policy "orbita notifications insert own"
on public.orbita_notifications for insert
with check (auth.uid() = user_id);

create policy "orbita notifications update own"
on public.orbita_notifications for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "orbita notifications delete own"
on public.orbita_notifications for delete
using (auth.uid() = user_id);

-- ---

create table if not exists public.orbita_push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  endpoint text not null,
  p256dh text not null,
  auth text not null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (endpoint)
);

create index if not exists orbita_push_subscriptions_user_idx
  on public.orbita_push_subscriptions (user_id);

alter table public.orbita_push_subscriptions enable row level security;

drop policy if exists "orbita push subs select own" on public.orbita_push_subscriptions;
drop policy if exists "orbita push subs insert own" on public.orbita_push_subscriptions;
drop policy if exists "orbita push subs update own" on public.orbita_push_subscriptions;
drop policy if exists "orbita push subs delete own" on public.orbita_push_subscriptions;

create policy "orbita push subs select own"
on public.orbita_push_subscriptions for select
using (auth.uid() = user_id);

create policy "orbita push subs insert own"
on public.orbita_push_subscriptions for insert
with check (auth.uid() = user_id);

create policy "orbita push subs update own"
on public.orbita_push_subscriptions for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "orbita push subs delete own"
on public.orbita_push_subscriptions for delete
using (auth.uid() = user_id);
