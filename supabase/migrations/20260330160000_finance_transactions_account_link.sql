-- Movimientos: cuenta (texto hoja) + FK opcional a orbita_finance_accounts
-- Índice único por hogar + etiqueta para upsert desde import

alter table public.orbita_finance_transactions
  add column if not exists account_label text not null default '';

alter table public.orbita_finance_transactions
  add column if not exists finance_account_id uuid references public.orbita_finance_accounts (id) on delete set null;

create index if not exists orbita_finance_tx_household_account_label_idx
  on public.orbita_finance_transactions (household_id, lower(trim(account_label)))
  where account_label <> '';

create index if not exists orbita_finance_tx_finance_account_id_idx
  on public.orbita_finance_transactions (finance_account_id)
  where finance_account_id is not null;

create unique index if not exists orbita_finance_accounts_household_label_uidx
  on public.orbita_finance_accounts (household_id, (lower(trim(label))))
  where deleted_at is null;

notify pgrst, 'reload schema';
