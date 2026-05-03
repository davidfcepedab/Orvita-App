-- Anclas de banca Belvo por hogar (SECURITY DEFINER): el RLS de bank_accounts solo expone
-- filas del usuario autenticado, pero los movimientos del ledger son del hogar completo.
-- Necesario para ocultar importaciones Belvo huérfanas tras desvincular en otro miembro o
-- limpiar estado previo a la purga en servidor.

create or replace function public.household_bank_belvo_ledger_anchors(p_household uuid)
returns table (
  finance_account_id text,
  ledger_label text
)
language plpgsql
security definer
set search_path = public
set row_security = off
as $$
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;

  if not exists (
    select 1
    from public.users u
    where u.id = auth.uid()
      and u.household_id is not null
      and u.household_id = p_household
  ) then
    raise exception 'household mismatch';
  end if;

  return query
  select
    nullif(trim(ba.metadata->>'orbita_finance_account_id'), '')::text as finance_account_id,
    (trim(ba.account_name) || ' · ' || coalesce(nullif(trim(ba.account_mask), ''), '****'))::text as ledger_label
  from public.bank_accounts ba
  inner join public.users u on u.id = ba.user_id
  where u.household_id = p_household
    and ba.connected is true;
end;
$$;

comment on function public.household_bank_belvo_ledger_anchors(uuid) is
  'Lista orbita_finance_account_id y etiquetas ledger de cuentas bancarias conectadas del hogar (Belvo).';

revoke all on function public.household_bank_belvo_ledger_anchors(uuid) from public;
grant execute on function public.household_bank_belvo_ledger_anchors(uuid) to authenticated;
