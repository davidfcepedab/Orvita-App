-- Fase 1 integraciones: Salud + Banca + toggles por usuario
create table if not exists public.integration_settings (
  user_id uuid primary key references auth.users(id) on delete cascade,
  health_enabled boolean not null default false,
  banking_enabled boolean not null default false,
  push_enhanced_enabled boolean not null default true,
  updated_at timestamptz not null default now()
);

create table if not exists public.integration_connections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  integration text not null check (integration in ('google_fit', 'apple_health_export', 'bancolombia', 'davivienda', 'nequi')),
  provider_account_id text,
  access_token text,
  refresh_token text,
  metadata jsonb not null default '{}'::jsonb,
  connected boolean not null default true,
  connected_at timestamptz not null default now(),
  last_synced_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.health_metrics (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  source text not null default 'google_fit',
  observed_at timestamptz not null default now(),
  sleep_hours numeric(4, 2),
  hrv_ms integer,
  readiness_score integer,
  steps integer,
  calories integer,
  energy_index integer generated always as (
    greatest(
      0,
      least(
        100,
        coalesce(readiness_score, 0)
      )
    )
  ) stored,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.bank_accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  provider text not null check (provider in ('bancolombia', 'davivienda', 'nequi')),
  account_name text not null,
  account_mask text,
  currency text not null default 'COP',
  balance_available numeric(14, 2) not null default 0,
  balance_current numeric(14, 2) not null default 0,
  metadata jsonb not null default '{}'::jsonb,
  connected boolean not null default true,
  last_synced_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  bank_account_id uuid not null references public.bank_accounts(id) on delete cascade,
  posted_at timestamptz not null,
  description text not null,
  amount numeric(14, 2) not null,
  direction text not null check (direction in ('credit', 'debit')),
  category text,
  currency text not null default 'COP',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_health_metrics_user_observed on public.health_metrics (user_id, observed_at desc);
create index if not exists idx_bank_accounts_user_provider on public.bank_accounts (user_id, provider);
create unique index if not exists idx_bank_accounts_unique on public.bank_accounts (user_id, provider, account_mask);
create index if not exists idx_transactions_user_posted on public.transactions (user_id, posted_at desc);
create index if not exists idx_transactions_account_posted on public.transactions (bank_account_id, posted_at desc);
create unique index if not exists idx_integration_connections_unique
  on public.integration_connections (user_id, integration, coalesce(provider_account_id, 'default'));

alter table public.integration_settings enable row level security;
alter table public.integration_connections enable row level security;
alter table public.health_metrics enable row level security;
alter table public.bank_accounts enable row level security;
alter table public.transactions enable row level security;

drop policy if exists "integration_settings_select_own" on public.integration_settings;
create policy "integration_settings_select_own"
  on public.integration_settings for select
  using (auth.uid() = user_id);

drop policy if exists "integration_settings_upsert_own" on public.integration_settings;
create policy "integration_settings_upsert_own"
  on public.integration_settings for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "integration_connections_select_own" on public.integration_connections;
create policy "integration_connections_select_own"
  on public.integration_connections for select
  using (auth.uid() = user_id);

drop policy if exists "integration_connections_write_own" on public.integration_connections;
create policy "integration_connections_write_own"
  on public.integration_connections for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "health_metrics_select_own" on public.health_metrics;
create policy "health_metrics_select_own"
  on public.health_metrics for select
  using (auth.uid() = user_id);

drop policy if exists "health_metrics_insert_own" on public.health_metrics;
create policy "health_metrics_insert_own"
  on public.health_metrics for insert
  with check (auth.uid() = user_id);

drop policy if exists "bank_accounts_select_own" on public.bank_accounts;
create policy "bank_accounts_select_own"
  on public.bank_accounts for select
  using (auth.uid() = user_id);

drop policy if exists "bank_accounts_write_own" on public.bank_accounts;
create policy "bank_accounts_write_own"
  on public.bank_accounts for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "transactions_select_own" on public.transactions;
create policy "transactions_select_own"
  on public.transactions for select
  using (auth.uid() = user_id);

drop policy if exists "transactions_insert_own" on public.transactions;
create policy "transactions_insert_own"
  on public.transactions for insert
  with check (auth.uid() = user_id);
