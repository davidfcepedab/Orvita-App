-- Puentes de conciliación mensual (explican brechas entre KPI y mapa estructural) + hints para sugerencias.

create table if not exists public.household_finance_month_bridge_entries (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households (id) on delete cascade,
  year integer not null check (year >= 2000 and year <= 2100),
  month integer not null check (month >= 1 and month <= 12),
  bridge_kind text not null default 'kpi_structural'
    check (bridge_kind in ('kpi_structural', 'other')),
  amount_cop numeric(18, 2) not null,
  label text not null default '',
  note text,
  created_at timestamptz not null default now()
);

comment on table public.household_finance_month_bridge_entries is
  'Líneas que el usuario registra para explicar desviaciones (p. ej. KPI operativo vs total del mapa fijo/variable).';

create index if not exists household_finance_month_bridge_entries_household_ym_idx
  on public.household_finance_month_bridge_entries (household_id, year desc, month desc);

alter table public.household_finance_month_bridge_entries enable row level security;

drop policy if exists "Household members read month bridge entries"
  on public.household_finance_month_bridge_entries;

create policy "Household members read month bridge entries"
  on public.household_finance_month_bridge_entries
  for select
  using (
    exists (
      select 1
      from public.users u
      where u.id = auth.uid()
        and u.household_id = household_finance_month_bridge_entries.household_id
    )
  );

drop policy if exists "Household members insert month bridge entries"
  on public.household_finance_month_bridge_entries;

create policy "Household members insert month bridge entries"
  on public.household_finance_month_bridge_entries
  for insert
  with check (
    exists (
      select 1
      from public.users u
      where u.id = auth.uid()
        and u.household_id = household_finance_month_bridge_entries.household_id
    )
  );

drop policy if exists "Household members delete own month bridge entries"
  on public.household_finance_month_bridge_entries;

create policy "Household members delete own month bridge entries"
  on public.household_finance_month_bridge_entries
  for delete
  using (
    exists (
      select 1
      from public.users u
      where u.id = auth.uid()
        and u.household_id = household_finance_month_bridge_entries.household_id
    )
  );

-- Agregados aprendidos (EMA u otros) por hogar; no reemplaza transacciones, solo sugiere.
create table if not exists public.household_finance_reconciliation_hints (
  household_id uuid not null references public.households (id) on delete cascade,
  hint_key text not null,
  value_json jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  primary key (household_id, hint_key)
);

comment on table public.household_finance_reconciliation_hints is
  'Patrones por hogar (p. ej. EMA de brecha KPI vs mapa) para sugerir el siguiente cierre.';

alter table public.household_finance_reconciliation_hints enable row level security;

drop policy if exists "Household members read finance reconciliation hints"
  on public.household_finance_reconciliation_hints;

create policy "Household members read finance reconciliation hints"
  on public.household_finance_reconciliation_hints
  for select
  using (
    exists (
      select 1
      from public.users u
      where u.id = auth.uid()
        and u.household_id = household_finance_reconciliation_hints.household_id
    )
  );

drop policy if exists "Household members upsert finance reconciliation hints"
  on public.household_finance_reconciliation_hints;

create policy "Household members upsert finance reconciliation hints"
  on public.household_finance_reconciliation_hints
  for insert
  with check (
    exists (
      select 1
      from public.users u
      where u.id = auth.uid()
        and u.household_id = household_finance_reconciliation_hints.household_id
    )
  );

drop policy if exists "Household members update finance reconciliation hints"
  on public.household_finance_reconciliation_hints;

create policy "Household members update finance reconciliation hints"
  on public.household_finance_reconciliation_hints
  for update
  using (
    exists (
      select 1
      from public.users u
      where u.id = auth.uid()
        and u.household_id = household_finance_reconciliation_hints.household_id
    )
  );
