-- Respaldo explícito: permitir INSERT en audit a miembros del hogar.
-- El trigger finance_audit_trigger corre como el usuario JWT; sin esta política,
-- solo existía SELECT en finance_transaction_audit → el INSERT fallaba (403 en PATCH al soft-delete).

drop policy if exists "Finance audit household insert" on public.finance_transaction_audit;

create policy "Finance audit household insert"
on public.finance_transaction_audit
for insert
to authenticated
with check (
  exists (
    select 1
    from public.users u
    where u.id = auth.uid()
      and u.household_id = finance_transaction_audit.household_id
  )
);

comment on policy "Finance audit household insert" on public.finance_transaction_audit is
  'Permite que el trigger de auditoría inserte filas del hogar del usuario (soft-delete / updates).';

notify pgrst, 'reload schema';
