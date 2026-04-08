-- 1) RLS en orbita_finance_transactions: políticas separadas + auth.uid() vía (select …)
--    Evita fallos intermitentes de WITH CHECK en UPDATE (soft-delete) que Postgres/PostgREST
--    reportan como "new row violates row-level security policy for table orbita_finance_transactions".
--    Ref: https://supabase.com/docs/guides/database/postgres/row-level-security#call-functions-with-select
--
-- 2) Auditoría: cuerpo del trigger + ALTER FUNCTION … SET row_security TO off (refuerzo sobre 20260403180000).
--    Ejecuta también 20260404120000 si no estaba aplicada.

-- ---------------------------------------------------------------------------
-- A) Políticas de movimientos (reemplazo idempotente de "Finance household access")
-- ---------------------------------------------------------------------------

drop policy if exists "Finance household access" on public.orbita_finance_transactions;
drop policy if exists "Finance transactions select" on public.orbita_finance_transactions;
drop policy if exists "Finance transactions insert" on public.orbita_finance_transactions;
drop policy if exists "Finance transactions update" on public.orbita_finance_transactions;
drop policy if exists "Finance transactions delete" on public.orbita_finance_transactions;

create policy "Finance transactions select"
on public.orbita_finance_transactions
for select
using (
  deleted_at is null
  and exists (
    select 1
    from public.users u
    where u.id = (select auth.uid())
      and u.household_id = orbita_finance_transactions.household_id
  )
);

create policy "Finance transactions insert"
on public.orbita_finance_transactions
for insert
with check (
  exists (
    select 1
    from public.users u
    where u.id = (select auth.uid())
      and u.household_id = orbita_finance_transactions.household_id
  )
);

-- UPDATE: filas activas; WITH CHECK permite el nuevo estado (p. ej. deleted_at timestamptz).
create policy "Finance transactions update"
on public.orbita_finance_transactions
for update
using (
  deleted_at is null
  and exists (
    select 1
    from public.users u
    where u.id = (select auth.uid())
      and u.household_id = orbita_finance_transactions.household_id
  )
)
with check (
  exists (
    select 1
    from public.users u
    where u.id = (select auth.uid())
      and u.household_id = orbita_finance_transactions.household_id
  )
);

-- Borrado físico (si se usa): solo filas activas del hogar.
create policy "Finance transactions delete"
on public.orbita_finance_transactions
for delete
using (
  deleted_at is null
  and exists (
    select 1
    from public.users u
    where u.id = (select auth.uid())
      and u.household_id = orbita_finance_transactions.household_id
  )
);

comment on policy "Finance transactions update" on public.orbita_finance_transactions is
  'Permite soft-delete (deleted_at) si el hogar coincide; USING solo filas activas.';

-- ---------------------------------------------------------------------------
-- B) Trigger de auditoría + RLS desactivada en el cuerpo de la función
-- ---------------------------------------------------------------------------

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

alter function public.finance_audit_trigger() set row_security to off;

comment on function public.finance_audit_trigger() is
  'SECURITY DEFINER + row_security off (función y set_config local): INSERT en finance_transaction_audit sin bloqueo RLS.';

-- ---------------------------------------------------------------------------
-- C) Política INSERT en audit (idempotente; por si faltaba en el proyecto remoto)
-- ---------------------------------------------------------------------------

drop policy if exists "Finance audit household insert" on public.finance_transaction_audit;

create policy "Finance audit household insert"
on public.finance_transaction_audit
for insert
with check (
  exists (
    select 1
    from public.users u
    where u.id = (select auth.uid())
      and u.household_id = finance_transaction_audit.household_id
  )
);

notify pgrst, 'reload schema';
