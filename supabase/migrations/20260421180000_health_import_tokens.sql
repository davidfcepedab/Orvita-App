-- Tokens de un solo uso para importar Apple Health desde Atajos iOS sin exponer sesión Supabase en el cliente del atajo.
create extension if not exists pgcrypto;

create table if not exists public.orvita_health_import_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  token_hash text not null,
  expires_at timestamptz not null,
  used_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists idx_orvita_health_import_tokens_user_created
  on public.orvita_health_import_tokens (user_id, created_at desc);

alter table public.orvita_health_import_tokens enable row level security;

drop policy if exists "orvita_health_import_tokens_select_own" on public.orvita_health_import_tokens;
create policy "orvita_health_import_tokens_select_own"
  on public.orvita_health_import_tokens for select
  using (auth.uid() = user_id);

drop policy if exists "orvita_health_import_tokens_insert_own" on public.orvita_health_import_tokens;
create policy "orvita_health_import_tokens_insert_own"
  on public.orvita_health_import_tokens for insert
  with check (auth.uid() = user_id);

drop policy if exists "orvita_health_import_tokens_update_own" on public.orvita_health_import_tokens;
create policy "orvita_health_import_tokens_update_own"
  on public.orvita_health_import_tokens for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
