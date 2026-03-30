-- Compromisos de flujo (simulador / próximos 30 días), por hogar. API server-side + household.

create table if not exists public.user_flow_commitments (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households (id) on delete cascade,
  title text not null,
  category text not null default '',
  due_date date not null,
  amount numeric(14, 2) not null default 0 check (amount >= 0),
  flow_type text not null default 'fixed' check (flow_type in ('fixed', 'one-time', 'recurring', 'income')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists user_flow_commitments_household_due_idx
  on public.user_flow_commitments (household_id, due_date);

do $migration$
begin
  if to_regclass('public.user_flow_commitments') is not null then
    alter table public.user_flow_commitments disable row level security;
    drop policy if exists "User flow commitments household access" on public.user_flow_commitments;
  end if;
end;
$migration$;
