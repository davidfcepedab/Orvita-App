-- Ingreso operativo persistido en snapshots (alineado a incomeForMetrics: excluye ingresos vinculados a TC).

alter table public.finance_monthly_snapshots
  add column if not exists total_income_operativo numeric not null default 0;

comment on column public.finance_monthly_snapshots.total_income_operativo is
  'Suma ingresos del mes excluyendo movimientos enlazados a cuentas tarjeta_credito (FK o etiqueta normalizada). Paridad con lib/finanzas/incomeCashEconomy.ts (sin heurística last4 en SQL).';

create or replace function public.orbita_fin_norm_label(l text)
returns text
language sql
immutable
parallel safe
as $$
  select lower(trim(both from regexp_replace(
    regexp_replace(coalesce(l, ''), '\s*\|\s*', '|', 'g'),
    '\s+', ' ', 'g'
  )));
$$;

create or replace function public.rebuild_month_snapshot(
  p_household uuid,
  p_year int,
  p_month int
)
returns void
language plpgsql
as $$
declare
  v_income numeric := 0;
  v_expense numeric := 0;
  v_income_operativo numeric := 0;
begin
  select
    coalesce(sum(case when t.type = 'income' then t.amount end), 0),
    coalesce(sum(case when t.type = 'expense' then t.amount end), 0)
  into v_income, v_expense
  from public.orbita_finance_transactions t
  where t.household_id = p_household
    and extract(year from t.date::date) = p_year
    and extract(month from t.date::date) = p_month
    and t.deleted_at is null;

  select coalesce(sum(t.amount), 0)
  into v_income_operativo
  from public.orbita_finance_transactions t
  where t.household_id = p_household
    and extract(year from t.date::date) = p_year
    and extract(month from t.date::date) = p_month
    and t.deleted_at is null
    and t.type = 'income'
    and coalesce(t.amount, 0) > 0
    and not exists (
      select 1
      from public.orbita_finance_accounts a
      where a.household_id = p_household
        and a.deleted_at is null
        and a.account_class = 'tarjeta_credito'
        and (
          (t.finance_account_id is not null and t.finance_account_id = a.id)
          or public.orbita_fin_norm_label(t.account_label) = public.orbita_fin_norm_label(a.label)
        )
    );

  insert into public.finance_monthly_snapshots (
    household_id,
    year,
    month,
    total_income,
    total_expense,
    balance,
    total_income_operativo,
    updated_at
  )
  values (
    p_household,
    p_year,
    p_month,
    v_income,
    v_expense,
    v_income - v_expense,
    v_income_operativo,
    now()
  )
  on conflict (household_id, year, month)
  do update set
    total_income = excluded.total_income,
    total_expense = excluded.total_expense,
    balance = excluded.balance,
    total_income_operativo = excluded.total_income_operativo,
    updated_at = now();
end;
$$;

-- Rellenar histórico con la misma regla (FK + etiqueta; sin last4).
update public.finance_monthly_snapshots fms
set total_income_operativo = coalesce(sub.v_op, 0)
from (
  select
    t.household_id as hid,
    extract(year from t.date::date)::int as y,
    extract(month from t.date::date)::int as m,
    sum(t.amount) as v_op
  from public.orbita_finance_transactions t
  where t.deleted_at is null
    and t.type = 'income'
    and coalesce(t.amount, 0) > 0
    and not exists (
      select 1
      from public.orbita_finance_accounts a
      where a.household_id = t.household_id
        and a.deleted_at is null
        and a.account_class = 'tarjeta_credito'
        and (
          (t.finance_account_id is not null and t.finance_account_id = a.id)
          or public.orbita_fin_norm_label(t.account_label) = public.orbita_fin_norm_label(a.label)
        )
    )
  group by t.household_id, extract(year from t.date::date), extract(month from t.date::date)
) sub
where fms.household_id = sub.hid
  and fms.year = sub.y
  and fms.month = sub.m;

-- Nota: el enlace TC por «últimos 4 en descripción» vive en TypeScript; el SQL usa FK y etiqueta.
comment on function public.rebuild_month_snapshot(uuid, int, int) is
  'Regenera fila finance_monthly_snapshots. total_income_operativo excluye ingresos ligados a tarjeta_credito (FK o etiqueta normalizada).';
