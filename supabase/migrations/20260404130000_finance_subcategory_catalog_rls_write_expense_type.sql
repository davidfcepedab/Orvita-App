-- 1) Edición del catálogo por hogar (filas con household_id no null). Las filas globales siguen solo lectura.
-- 2) Nuevo valor expense_type: modulo_finanzas — para filtrar y aislar del análisis operativo en app.

drop policy if exists "orbita_finance_subcategory_catalog_insert" on public.orbita_finance_subcategory_catalog;
create policy "orbita_finance_subcategory_catalog_insert"
on public.orbita_finance_subcategory_catalog
for insert
to authenticated
with check (
  household_id is not null
  and exists (
    select 1
    from public.users u
    where u.id = auth.uid()
      and u.household_id = orbita_finance_subcategory_catalog.household_id
  )
);

drop policy if exists "orbita_finance_subcategory_catalog_update" on public.orbita_finance_subcategory_catalog;
create policy "orbita_finance_subcategory_catalog_update"
on public.orbita_finance_subcategory_catalog
for update
to authenticated
using (
  household_id is not null
  and exists (
    select 1
    from public.users u
    where u.id = auth.uid()
      and u.household_id = orbita_finance_subcategory_catalog.household_id
  )
)
with check (
  household_id is not null
  and exists (
    select 1
    from public.users u
    where u.id = auth.uid()
      and u.household_id = orbita_finance_subcategory_catalog.household_id
  )
);

drop policy if exists "orbita_finance_subcategory_catalog_delete" on public.orbita_finance_subcategory_catalog;
create policy "orbita_finance_subcategory_catalog_delete"
on public.orbita_finance_subcategory_catalog
for delete
to authenticated
using (
  household_id is not null
  and exists (
    select 1
    from public.users u
    where u.id = auth.uid()
      and u.household_id = orbita_finance_subcategory_catalog.household_id
  )
);

alter table public.orbita_finance_subcategory_catalog
  drop constraint if exists orbita_finance_subcategory_catalog_expense_type_check;

alter table public.orbita_finance_subcategory_catalog
  add constraint orbita_finance_subcategory_catalog_expense_type_check
  check (expense_type in ('fijo', 'variable', 'modulo_finanzas'));

comment on column public.orbita_finance_subcategory_catalog.expense_type is
  'fijo/variable: mapa operativo; modulo_finanzas: solo bloque financiero / excluido de agregados operativos en la app.';

notify pgrst, 'reload schema';
