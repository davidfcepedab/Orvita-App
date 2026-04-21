-- Fix upsert conflict target for integration_connections.
-- Previous index used an expression with COALESCE, which cannot be targeted by
-- onConflict: "user_id,integration,provider_account_id" from Supabase upserts.

update public.integration_connections
set provider_account_id = 'default'
where provider_account_id is null;

alter table public.integration_connections
  alter column provider_account_id set default 'default';

alter table public.integration_connections
  alter column provider_account_id set not null;

drop index if exists public.idx_integration_connections_unique;

create unique index if not exists idx_integration_connections_unique
  on public.integration_connections (user_id, integration, provider_account_id);
