-- Apple Health import tokens: persistent revocable API key (hash-only), optional legacy expiry.
-- Reuses used_at as "last successful import" timestamp (no new last_used_at column).

alter table public.orvita_health_import_tokens
  add column if not exists revoked_at timestamptz;

alter table public.orvita_health_import_tokens
  alter column expires_at drop not null;

-- At most one logical "keeper" row per user among non-revoked rows; revoke the rest (legacy duplicates).
update public.orvita_health_import_tokens t
set revoked_at = now()
where t.revoked_at is null
  and t.id not in (
    select distinct on (user_id) id
    from public.orvita_health_import_tokens
    where revoked_at is null
    order by user_id, created_at desc
  );

-- Remaining active tokens: no automatic expiry (new contract).
update public.orvita_health_import_tokens
set expires_at = null
where revoked_at is null;

-- Partial index cannot use now(); data cleanup above ensures one non-revoked row per user.
create unique index if not exists idx_orvita_health_import_tokens_one_active_per_user
  on public.orvita_health_import_tokens (user_id)
  where (revoked_at is null);
