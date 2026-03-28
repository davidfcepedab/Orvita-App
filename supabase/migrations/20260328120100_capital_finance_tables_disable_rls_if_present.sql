-- Idempotente: entornos que ya aplicaron RLS sobre estas tablas quedan alineados con "RLS diferido".

do $migration$
begin
  if to_regclass('public.user_subscriptions') is not null then
    alter table public.user_subscriptions disable row level security;
    drop policy if exists "User subscriptions household access" on public.user_subscriptions;
  end if;

  if to_regclass('public.household_finance_manual_items') is not null then
    alter table public.household_finance_manual_items disable row level security;
    drop policy if exists "Household finance manual items access" on public.household_finance_manual_items;
  end if;
end;
$migration$;
