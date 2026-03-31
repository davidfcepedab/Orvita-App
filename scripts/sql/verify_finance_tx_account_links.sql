-- Diagnóstico: movimientos sin vínculo explícito a cuenta (revisar en SQL Editor de Supabase).
-- Sustituye :household_id por el uuid del hogar (tabla households / tu app).

-- 1) Tarjetas de crédito en catálogo
-- select id, label, credit_limit, balance_used
-- from orbita_finance_accounts
-- where household_id = :household_id and deleted_at is null and account_class = 'tarjeta_credito';

-- 2) Movimientos del hogar sin finance_account_id ni account_label útil
select id, date, description, amount, type, category, subcategory,
       finance_account_id, account_label
from orbita_finance_transactions
where household_id = :household_id
  and deleted_at is null
  and coalesce(trim(account_label), '') = ''
  and finance_account_id is null
order by date desc
limit 200;

-- 3) Tras backfill: movimientos ya enlazados por FK
-- select count(*) from orbita_finance_transactions
-- where household_id = :household_id and deleted_at is null and finance_account_id is not null;
