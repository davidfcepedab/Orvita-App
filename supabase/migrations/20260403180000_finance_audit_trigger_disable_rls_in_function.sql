-- El INSERT desde el trigger seguía sujeto a RLS como rol de sesión en algunos casos.
-- Desactivar RLS solo durante el cuerpo de la función (transacción) permite escribir el audit
-- sin depender de que la política INSERT coincida con auth.uid() / public.users.

create or replace function public.finance_audit_trigger()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform set_config('row_security', 'off', true);

  if (tg_op = 'UPDATE') then
    insert into public.finance_transaction_audit(
      transaction_id,
      household_id,
      action,
      old_data,
      new_data,
      changed_by
    )
    values(
      old.id,
      old.household_id,
      'update',
      row_to_json(old),
      row_to_json(new),
      auth.uid()
    );
    return new;
  elsif (tg_op = 'DELETE') then
    insert into public.finance_transaction_audit(
      transaction_id,
      household_id,
      action,
      old_data,
      changed_by
    )
    values(
      old.id,
      old.household_id,
      'delete',
      row_to_json(old),
      auth.uid()
    );
    return old;
  end if;
  return null;
end;
$$;

comment on function public.finance_audit_trigger() is
  'SECURITY DEFINER + row_security off local: inserta audit sin bloqueo RLS del INSERT.';

notify pgrst, 'reload schema';
