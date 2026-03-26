-- Finance audit log (idempotent)

create table if not exists public.finance_transaction_audit (
  id uuid primary key default gen_random_uuid(),
  transaction_id uuid,
  household_id uuid not null,
  action text not null,
  old_data jsonb,
  new_data jsonb,
  changed_by uuid,
  changed_at timestamptz default now()
);

alter table public.finance_transaction_audit
  enable row level security;

drop policy if exists "Finance audit household access"
on public.finance_transaction_audit;

create policy "Finance audit household access"
on public.finance_transaction_audit
for select
using (
  exists (
    select 1
    from public.users u
    where u.id = auth.uid()
      and u.household_id = finance_transaction_audit.household_id
  )
);

create or replace function public.finance_audit_trigger()
returns trigger as $$
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
$$ language plpgsql;

drop trigger if exists finance_audit_trigger
on public.orbita_finance_transactions;

create trigger finance_audit_trigger
after update or delete
on public.orbita_finance_transactions
for each row
execute function public.finance_audit_trigger();
