-- Single-household architecture (non-destructive, idempotent)

create table if not exists public.households (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  owner_user_id uuid references public.users (id) on delete set null,
  created_at timestamptz not null default now()
);

alter table public.users
  add column if not exists household_id uuid references public.households (id);

create index if not exists households_owner_user_id_idx
  on public.households (owner_user_id);

create index if not exists users_household_id_idx
  on public.users (household_id);

-- Backfill: one household per existing user without household_id
insert into public.households (name, owner_user_id)
select
  coalesce(u.email, 'Household'),
  u.id
from public.users u
left join public.households h on h.owner_user_id = u.id
where u.household_id is null
  and h.id is null;

update public.users u
set household_id = h.id
from public.households h
where h.owner_user_id = u.id
  and u.household_id is null;

-- Extend operational_tasks for household sharing
alter table public.operational_tasks
  add column if not exists household_id uuid references public.households (id);

create index if not exists operational_tasks_household_id_idx
  on public.operational_tasks (household_id);

-- Backfill agenda tasks to household_id when missing
update public.operational_tasks ot
set household_id = u.household_id
from public.users u
where ot.domain = 'agenda'
  and ot.user_id = u.id
  and ot.household_id is null;

-- Finance transactions: add household_id if table exists
do $$
begin
  if to_regclass('public.orbita_finance_transactions') is not null then
    execute 'alter table public.orbita_finance_transactions add column if not exists household_id uuid references public.households (id)';
    execute 'create index if not exists orbita_finance_transactions_household_id_idx on public.orbita_finance_transactions (household_id)';
  end if;
end $$;

-- RLS: allow household members to read/update agenda tasks
drop policy if exists "Agenda household members can access tasks" on public.operational_tasks;
drop policy if exists "Agenda household members can update tasks" on public.operational_tasks;

create policy "Agenda household members can access tasks"
on public.operational_tasks
for select
using (
  (auth.uid() = user_id)
  or (
    domain = 'agenda'
    and exists (
      select 1
      from public.users u
      where u.id = auth.uid()
        and u.household_id = operational_tasks.household_id
    )
  )
);

create policy "Agenda household members can update tasks"
on public.operational_tasks
for update
using (
  (auth.uid() = user_id)
  or (
    domain = 'agenda'
    and exists (
      select 1
      from public.users u
      where u.id = auth.uid()
        and u.household_id = operational_tasks.household_id
    )
  )
);

-- RLS for shared finance transactions if table exists
do $$
begin
  if to_regclass('public.orbita_finance_transactions') is not null then
    execute 'alter table public.orbita_finance_transactions enable row level security';
    execute 'drop policy if exists "Household members can access finance transactions" on public.orbita_finance_transactions';
    execute '
      create policy "Household members can access finance transactions"
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
      )';
  end if;
end $$;
