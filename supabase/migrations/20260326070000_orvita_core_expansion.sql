create extension if not exists "pgcrypto";

create table if not exists public.users (
  id uuid primary key references auth.users (id) on delete cascade,
  email text,
  created_at timestamptz not null default now()
);

create table if not exists public.operational_tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.users (id) on delete cascade,
  title text not null,
  completed boolean not null default false,
  domain text not null check (domain in ('salud', 'fisico', 'profesional')),
  created_at timestamptz not null default now()
);

create table if not exists public.operational_habits (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.users (id) on delete cascade,
  name text not null,
  completed boolean not null default false,
  domain text not null check (domain in ('salud', 'fisico', 'profesional')),
  created_at timestamptz not null default now()
);

create table if not exists public.checkins (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.users (id) on delete cascade,
  score_global numeric,
  score_fisico numeric,
  score_salud numeric,
  score_profesional numeric,
  created_at timestamptz not null default now()
);

create index if not exists users_created_at_idx on public.users (created_at desc);
create index if not exists operational_tasks_user_id_idx on public.operational_tasks (user_id);
create index if not exists operational_habits_user_id_idx on public.operational_habits (user_id);
create index if not exists checkins_user_id_idx on public.checkins (user_id);

alter table public.users enable row level security;
alter table public.operational_tasks enable row level security;
alter table public.operational_habits enable row level security;
alter table public.checkins enable row level security;

drop policy if exists "Users can manage their profile" on public.users;
drop policy if exists "Users can manage their own tasks" on public.operational_tasks;
drop policy if exists "Users can manage their own habits" on public.operational_habits;
drop policy if exists "Users can manage their own checkins" on public.checkins;

create policy "Users can manage their profile"
on public.users
for all
using (auth.uid() = id)
with check (auth.uid() = id);

create policy "Users can manage their own tasks"
on public.operational_tasks
for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "Users can manage their own habits"
on public.operational_habits
for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "Users can manage their own checkins"
on public.checkins
for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);
