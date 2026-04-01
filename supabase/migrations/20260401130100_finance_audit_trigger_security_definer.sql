-- finance_audit_trigger inserts into finance_transaction_audit after UPDATE/DELETE.
-- That table only had a SELECT RLS policy, so INSERT from the trigger ran as the
-- session user and was denied → soft-delete (PATCH) on orbita_finance_transactions returned 403.

create or replace function public.finance_audit_trigger()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
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
  'SECURITY DEFINER: audit INSERT must succeed; RLS on finance_transaction_audit only allows SELECT to members.';

notify pgrst, 'reload schema';
