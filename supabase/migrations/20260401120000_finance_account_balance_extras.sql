-- Campos para saldo disponible operativo: créditos extra (cashback, etc.) y ajuste de reconciliación.
alter table public.orbita_finance_accounts
  add column if not exists creditos_extras numeric(18, 2) not null default 0;

alter table public.orbita_finance_accounts
  add column if not exists balance_reconciliation_adjustment numeric(18, 2) not null default 0;

alter table public.orbita_finance_accounts
  add column if not exists reconciliation_note text null;

comment on column public.orbita_finance_accounts.creditos_extras is
  'Suma positiva tipo cashback, reintegros, bonos temporales (+ uso en fórmula disponible).';

comment on column public.orbita_finance_accounts.balance_reconciliation_adjustment is
  'Ajuste manual puntual (COP) aplicado al disponible tras cupo+uso+extras; reconciliación con la realidad.';

comment on column public.orbita_finance_accounts.reconciliation_note is
  'Nota libre del usuario al reconciliar.';

comment on column public.orbita_finance_accounts.manual_balance_on is
  'Fecha del último cierre / reconciliación manual del saldo declarado.';

notify pgrst, 'reload schema';
