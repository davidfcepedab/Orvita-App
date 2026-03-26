-- Finance v2 hardening (idempotent)

-- Add structural columns
alter table public.orbita_finance_transactions
  add column if not exists type text,
  add column if not exists currency text default 'USD',
  add column if not exists created_at timestamptz default now(),
  add column if not exists updated_at timestamptz default now();

-- Backfill type based on amount sign if missing
update public.orbita_finance_transactions
set type = case
  when amount < 0 then 'expense'
  else 'income'
end
where type is null;

-- Normalize to positive amounts
update public.orbita_finance_transactions
set amount = abs(amount)
where amount < 0;

-- Enforce enum constraint
alter table public.orbita_finance_transactions
  drop constraint if exists finance_type_check;

alter table public.orbita_finance_transactions
  add constraint finance_type_check
  check (type in ('income','expense'));

-- Enforce positive amount
alter table public.orbita_finance_transactions
  drop constraint if exists finance_amount_positive;

alter table public.orbita_finance_transactions
  add constraint finance_amount_positive
  check (amount > 0);

-- Performance index
create index if not exists finance_household_date_idx
  on public.orbita_finance_transactions (household_id, date desc);
