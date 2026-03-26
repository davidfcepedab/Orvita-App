-- Finance snapshot rebuild function

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
begin
  select
    coalesce(sum(case when type='income' then amount end),0),
    coalesce(sum(case when type='expense' then amount end),0)
  into v_income, v_expense
  from public.orbita_finance_transactions
  where household_id = p_household
    and extract(year from date) = p_year
    and extract(month from date) = p_month;

  insert into public.finance_monthly_snapshots (
    household_id,
    year,
    month,
    total_income,
    total_expense,
    balance,
    updated_at
  )
  values (
    p_household,
    p_year,
    p_month,
    v_income,
    v_expense,
    v_income - v_expense,
    now()
  )
  on conflict (household_id, year, month)
  do update
  set total_income = excluded.total_income,
      total_expense = excluded.total_expense,
      balance = excluded.balance,
      updated_at = now();
end;
$$;
