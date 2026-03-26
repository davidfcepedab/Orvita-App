-- Finance monthly snapshots (v1)

create table if not exists public.finance_monthly_snapshots (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null,
  year integer not null,
  month integer not null,
  total_income numeric not null default 0,
  total_expense numeric not null default 0,
  balance numeric not null default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique (household_id, year, month)
);

alter table public.finance_monthly_snapshots
  enable row level security;

drop policy if exists "Finance snapshot household access"
on public.finance_monthly_snapshots;

create policy "Finance snapshot household access"
on public.finance_monthly_snapshots
for all
using (
  exists (
    select 1
    from public.users u
    where u.id = auth.uid()
      and u.household_id = finance_monthly_snapshots.household_id
  )
)
with check (
  exists (
    select 1
    from public.users u
    where u.id = auth.uid()
      and u.household_id = finance_monthly_snapshots.household_id
  )
);

create index if not exists finance_snapshot_household_idx
  on public.finance_monthly_snapshots (household_id, year, month);

insert into public.finance_monthly_snapshots (
  household_id,
  year,
  month,
  total_income,
  total_expense,
  balance
)
select
  household_id,
  extract(year from date)::int,
  extract(month from date)::int,
  coalesce(sum(case when type='income' then amount end),0),
  coalesce(sum(case when type='expense' then amount end),0),
  coalesce(sum(case when type='income' then amount end),0)
    - coalesce(sum(case when type='expense' then amount end),0)
from public.orbita_finance_transactions
group by household_id, extract(year from date), extract(month from date)
on conflict (household_id, year, month) do nothing;
