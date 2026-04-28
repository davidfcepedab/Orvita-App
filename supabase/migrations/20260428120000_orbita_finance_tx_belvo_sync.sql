-- Movimientos espejados desde Belvo / banca abierta → mismo ledger que Capital (overview, PL, etc.)

alter table public.orbita_finance_transactions
  add column if not exists sync_source text null;

alter table public.orbita_finance_transactions
  add column if not exists sync_external_id text null;

comment on column public.orbita_finance_transactions.sync_source is
  'Origen automático del movimiento (p. ej. belvo).';

comment on column public.orbita_finance_transactions.sync_external_id is
  'ID estable en el origen (p. ej. belvo transaction id) para deduplicar sincronizaciones.';

create unique index if not exists orbita_finance_tx_sync_dedupe_uidx
  on public.orbita_finance_transactions (household_id, sync_source, sync_external_id)
  where deleted_at is null
    and sync_external_id is not null
    and sync_source is not null;

notify pgrst, 'reload schema';
