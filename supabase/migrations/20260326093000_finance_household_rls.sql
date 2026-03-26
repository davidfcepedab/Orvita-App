-- Harden Finance module: household-scoped RLS + integrity

-------------------------------------------------
-- 1) Add household_id if missing
-------------------------------------------------

alter table public.orbita_finance_transactions
  add column if not exists household_id uuid;

-------------------------------------------------
-- 2) Backfill household_id from users
-------------------------------------------------

update public.orbita_finance_transactions t
set household_id = u.household_id
from public.users u
where t.profile_id = u.id::text
  and t.household_id is null;

-------------------------------------------------
-- 3) Safety check before enforcing NOT NULL
-------------------------------------------------

do $$
declare
  missing_count integer;
begin
  select count(*) into missing_count
  from public.orbita_finance_transactions
  where household_id is null;

  if missing_count > 0 then
    raise exception 'Finance rows without household_id: %', missing_count;
  end if;
end $$;

-------------------------------------------------
-- 4) Enforce NOT NULL
-------------------------------------------------

alter table public.orbita_finance_transactions
  alter column household_id set not null;

-------------------------------------------------
-- 5) Enable RLS
-------------------------------------------------

alter table public.orbita_finance_transactions
  enable row level security;

-------------------------------------------------
-- 6) Drop legacy policies
-------------------------------------------------

do $$
begin
  if exists (
    select 1
    from pg_policies
    where tablename = 'orbita_finance_transactions'
  ) then
    execute (
      select string_agg(
        format('drop policy if exists "%s" on public.orbita_finance_transactions;', policyname),
        ' '
      )
      from pg_policies
      where tablename = 'orbita_finance_transactions'
    );
  end if;
end $$;

-------------------------------------------------
-- 7) Create household-based RLS policy
-------------------------------------------------

create policy "Finance household access"
on public.orbita_finance_transactions
for all
using (
  exists (
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

-------------------------------------------------
-- 8) Performance Indexes
-------------------------------------------------

create index if not exists finance_household_idx
  on public.orbita_finance_transactions (household_id);

create index if not exists finance_date_idx
  on public.orbita_finance_transactions (date);

create index if not exists finance_category_idx
  on public.orbita_finance_transactions (category);

create index if not exists finance_subcategory_idx
  on public.orbita_finance_transactions (subcategory);

-------------------------------------------------
-- DONE
-------------------------------------------------
