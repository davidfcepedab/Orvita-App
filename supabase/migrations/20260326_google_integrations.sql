-- Google Integrations + soft delete + finance indexes (v1.2.0)

---------------------------------------------
-- 1) Google integrations table
---------------------------------------------
create table if not exists public.user_integrations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  provider text not null,
  access_token text not null,
  refresh_token text not null,
  expires_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique (user_id, provider)
);

alter table public.user_integrations enable row level security;

drop policy if exists "Users can manage their own integrations" on public.user_integrations;
create policy "Users can manage their own integrations"
on public.user_integrations
for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

---------------------------------------------
-- 2) External calendar events
---------------------------------------------
create table if not exists public.external_calendar_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  google_event_id text not null,
  summary text,
  start_at timestamptz,
  end_at timestamptz,
  raw jsonb,
  synced_at timestamptz default now(),
  deleted_at timestamptz,
  unique (user_id, google_event_id)
);

alter table public.external_calendar_events enable row level security;

drop policy if exists "Users can access their calendar events" on public.external_calendar_events;
create policy "Users can access their calendar events"
on public.external_calendar_events
for all
using (auth.uid() = user_id and deleted_at is null)
with check (auth.uid() = user_id);

---------------------------------------------
-- 3) External tasks
---------------------------------------------
create table if not exists public.external_tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  google_task_id text not null,
  title text,
  status text,
  due_date timestamptz,
  raw jsonb,
  synced_at timestamptz default now(),
  deleted_at timestamptz,
  unique (user_id, google_task_id)
);

alter table public.external_tasks enable row level security;

drop policy if exists "Users can access their external tasks" on public.external_tasks;
create policy "Users can access their external tasks"
on public.external_tasks
for all
using (auth.uid() = user_id and deleted_at is null)
with check (auth.uid() = user_id);

---------------------------------------------
-- 4) Soft delete columns
---------------------------------------------
alter table public.operational_tasks
  add column if not exists deleted_at timestamptz;

alter table public.orbita_finance_transactions
  add column if not exists deleted_at timestamptz;

---------------------------------------------
-- 5) RLS updates (soft delete enforced in USING)
---------------------------------------------

drop policy if exists "Users can manage their own tasks" on public.operational_tasks;
create policy "Users can manage their own tasks"
on public.operational_tasks
for all
using (
  deleted_at is null and (
    (
      domain <> 'agenda'
      and auth.uid() = user_id
    )
    or
    (
      domain = 'agenda'
      and exists (
        select 1
        from public.users u
        where u.id = auth.uid()
          and u.household_id = operational_tasks.household_id
      )
    )
  )
)
with check (
  (
    domain <> 'agenda'
    and auth.uid() = user_id
  )
  or
  (
    domain = 'agenda'
    and exists (
      select 1
      from public.users u
      where u.id = auth.uid()
        and u.household_id = operational_tasks.household_id
    )
  )
);


drop policy if exists "Finance household access" on public.orbita_finance_transactions;
create policy "Finance household access"
on public.orbita_finance_transactions
for all
using (
  deleted_at is null and exists (
    select 1
    from public.users u
    where u.id = auth.uid()
      and u.household_id = orbita_finance_transactions.household_id
  )
)
with check (
  exists (
    select 1
    from public.users u
    where u.id = auth.uid()
      and u.household_id = orbita_finance_transactions.household_id
  )
);

---------------------------------------------
-- 6) Financial indexes
---------------------------------------------

do $$
begin
  if to_regclass('public.finance_monthly_snapshots') is not null then
    execute 'create index if not exists idx_finance_snapshots_household_month on public.finance_monthly_snapshots (household_id, year, month)';
  end if;

  if to_regclass('public.orbita_finance_transactions') is not null then
    if exists (
      select 1
      from information_schema.columns
      where table_schema = 'public'
        and table_name = 'orbita_finance_transactions'
        and column_name = 'occurred_at'
    ) then
      execute 'create index if not exists idx_transactions_household_date on public.orbita_finance_transactions (household_id, occurred_at)';
    end if;

    if exists (
      select 1
      from information_schema.columns
      where table_schema = 'public'
        and table_name = 'orbita_finance_transactions'
        and column_name = 'category_id'
    ) then
      execute 'create index if not exists idx_transactions_household_category on public.orbita_finance_transactions (household_id, category_id)';
    end if;
  end if;
end $$;

-- DONE
