-- Presupuestos por categoría/subcategoría compartidos por hogar (plantilla mensual lineal).
create table if not exists public.household_finance_category_budgets (
  household_id uuid primary key references public.households (id) on delete cascade,
  template jsonb not null default '{"version":1,"category":{},"subcategory":{}}'::jsonb,
  updated_at timestamptz not null default now()
);

comment on table public.household_finance_category_budgets is
  'Topes COP mensuales por categoría (plantilla que aplica igual a todos los meses).';

create index if not exists household_finance_category_budgets_updated_idx
  on public.household_finance_category_budgets (updated_at desc);

alter table public.household_finance_category_budgets enable row level security;

drop policy if exists "Household members read finance category budgets"
  on public.household_finance_category_budgets;

create policy "Household members read finance category budgets"
  on public.household_finance_category_budgets
  for select
  using (
    exists (
      select 1
      from public.users u
      where u.id = auth.uid()
        and u.household_id = household_finance_category_budgets.household_id
    )
  );

drop policy if exists "Household members insert finance category budgets"
  on public.household_finance_category_budgets;

create policy "Household members insert finance category budgets"
  on public.household_finance_category_budgets
  for insert
  with check (
    exists (
      select 1
      from public.users u
      where u.id = auth.uid()
        and u.household_id = household_finance_category_budgets.household_id
    )
  );

drop policy if exists "Household members update finance category budgets"
  on public.household_finance_category_budgets;

create policy "Household members update finance category budgets"
  on public.household_finance_category_budgets
  for update
  using (
    exists (
      select 1
      from public.users u
      where u.id = auth.uid()
        and u.household_id = household_finance_category_budgets.household_id
    )
  )
  with check (
    exists (
      select 1
      from public.users u
      where u.id = auth.uid()
        and u.household_id = household_finance_category_budgets.household_id
    )
  );
