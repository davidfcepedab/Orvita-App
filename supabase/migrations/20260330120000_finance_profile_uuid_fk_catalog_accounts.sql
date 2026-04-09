-- Finance: profile_id integrity, subcategory catalog (hoja Categorías), ledger accounts (hoja Cuentas)

-- -----------------------------------------------------------------------------
-- 1) orbita_finance_transactions.profile_id → uuid + FK → public.users(id)
-- -----------------------------------------------------------------------------
do $$
declare
  col_type text;
begin
  if to_regclass('public.orbita_finance_transactions') is null then
    raise notice 'orbita_finance_transactions not found; skip profile_id migration';
    return;
  end if;

  select c.data_type into col_type
  from information_schema.columns c
  where c.table_schema = 'public'
    and c.table_name = 'orbita_finance_transactions'
    and c.column_name = 'profile_id';

  if col_type is null then
    raise notice 'orbita_finance_transactions.profile_id missing; skip';
    return;
  end if;

  if col_type = 'text' then
    update public.orbita_finance_transactions t
    set profile_id = (
      select u.id::text
      from public.users u
      where u.household_id = t.household_id
      order by u.created_at asc nulls last
      limit 1
    )
    where profile_id is null
       or trim(profile_id) = ''
       or not exists (
         select 1 from public.users pu where pu.id::text = trim(t.profile_id)
       );

    alter table public.orbita_finance_transactions
      alter column profile_id type uuid using trim(profile_id)::uuid;
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'orbita_finance_transactions_profile_id_fkey'
      and conrelid = 'public.orbita_finance_transactions'::regclass
  ) then
    alter table public.orbita_finance_transactions
      add constraint orbita_finance_transactions_profile_id_fkey
      foreign key (profile_id) references public.users (id)
      on delete restrict;
  end if;
end $$;

create index if not exists orbita_finance_transactions_profile_id_idx
  on public.orbita_finance_transactions (profile_id);

-- -----------------------------------------------------------------------------
-- 2) Catálogo maestro subcategoría ↔ categoría (alinea con Google Sheet Categorias)
-- -----------------------------------------------------------------------------
create table if not exists public.orbita_finance_subcategory_catalog (
  id uuid primary key default gen_random_uuid(),
  household_id uuid references public.households (id) on delete cascade,
  subcategory text not null,
  category text not null,
  expense_type text not null check (expense_type in ('fijo', 'variable')),
  financial_impact text not null check (
    financial_impact in ('operativo', 'inversion', 'transferencia', 'financiero', 'ajuste')
  ),
  budgetable boolean not null default true,
  active boolean not null default true,
  comment text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists orbita_finance_subcat_cat_global_sub_idx
  on public.orbita_finance_subcategory_catalog (lower(trim(subcategory)))
  where household_id is null;

create unique index if not exists orbita_finance_subcat_cat_household_sub_idx
  on public.orbita_finance_subcategory_catalog (household_id, lower(trim(subcategory)))
  where household_id is not null;

create index if not exists orbita_finance_subcat_cat_household_idx
  on public.orbita_finance_subcategory_catalog (household_id)
  where household_id is not null;

alter table public.orbita_finance_subcategory_catalog enable row level security;

drop policy if exists "orbita_finance_subcategory_catalog_select" on public.orbita_finance_subcategory_catalog;
create policy "orbita_finance_subcategory_catalog_select"
on public.orbita_finance_subcategory_catalog
for select
to authenticated
using (
  household_id is null
  or exists (
    select 1
    from public.users u
    where u.id = auth.uid()
      and u.household_id = orbita_finance_subcategory_catalog.household_id
  )
);

-- Plantilla global Casa Mambo / Órvita (idempotente; alinea con hoja Categorias)
insert into public.orbita_finance_subcategory_catalog (
  household_id, subcategory, category, expense_type, financial_impact, budgetable, active, comment
)
select
  null::uuid,
  v.subcategory,
  v.category,
  v.expense_type,
  v.financial_impact,
  v.budgetable,
  v.active,
  v.comment
from (values
  ('Arriendo', 'Hogar & Base', 'fijo', 'operativo', true, true, 'Vivienda principal'),
  ('Administracion vivienda', 'Hogar & Base', 'fijo', 'operativo', true, true, 'Administracion / cuotas'),
  ('Servicios hogar', 'Hogar & Base', 'variable', 'operativo', true, true, 'Servicios publicos y hogar'),
  ('Hogar', 'Hogar & Base', 'variable', 'operativo', true, true, 'Miscelaneos del hogar'),
  ('Mascota', 'Hogar & Base', 'variable', 'operativo', true, true, 'Gastos mascota'),
  ('Vivienda inversion', 'Hogar & Base', 'fijo', 'inversion', true, true, 'Inmuebles no habitados'),
  ('Mercado hogar', 'Alimentacion', 'variable', 'operativo', true, true, 'Supermercado y despensa'),
  ('Comidas fuera - cotidiano', 'Alimentacion', 'variable', 'operativo', true, true, 'Almuerzos y comidas habituales'),
  ('Comidas fuera - social', 'Alimentacion', 'variable', 'operativo', true, true, 'Salidas sociales y restaurantes'),
  ('Transporte y gasolina', 'Movilidad', 'variable', 'operativo', true, true, 'Vehiculo propio'),
  ('Transporte App', 'Movilidad', 'variable', 'operativo', true, true, 'Uber, taxi, apps'),
  ('Ropa', 'Personal', 'variable', 'operativo', true, true, 'Vestuario'),
  ('Cuidado personal', 'Personal', 'variable', 'operativo', true, true, 'Peluqueria, cuidado personal'),
  ('Salud', 'Salud & Bienestar', 'variable', 'operativo', true, true, 'Salud general'),
  ('Gimnasio / deporte', 'Salud & Bienestar', 'fijo', 'operativo', true, true, 'Gimnasio, deporte'),
  ('Suplementacion', 'Salud & Bienestar', 'variable', 'operativo', true, true, 'Suplementos'),
  ('Entretenimiento & Lifestyle', 'Suscripciones', 'fijo', 'operativo', true, true, 'Streaming, entretenimiento'),
  ('Productividad & crecimiento', 'Suscripciones', 'fijo', 'operativo', true, true, 'Apps de trabajo y estudio'),
  ('Servicios digitales', 'Suscripciones', 'fijo', 'operativo', true, true, 'Servicios digitales varios'),
  ('Servicios financieros recurrentes', 'Finanzas', 'fijo', 'operativo', false, true, 'Cuotas bancarias'),
  ('Pagos tarjeta de credito', 'Finanzas', 'fijo', 'operativo', false, true, 'Pago de tarjeta (reduce deuda)'),
  ('Movimientos Temporales', 'Finanzas', 'variable', 'transferencia', false, true, 'Prestamos temporales / internos'),
  ('Servicio de deuda', 'Finanzas', 'fijo', 'financiero', false, true, 'Prestamos y creditos'),
  ('Impuestos', 'Obligaciones', 'fijo', 'operativo', true, true, 'Impuestos y obligaciones legales'),
  ('Inversiones Fijas', 'Obligaciones', 'fijo', 'inversion', true, true, 'Ahorro / inversiones periodicas'),
  ('Apple For Life', 'Obligaciones', 'fijo', 'operativo', true, true, 'Obligacion estructural'),
  ('Educacion - ICETEX', 'Desarrollo', 'fijo', 'inversion', true, true, 'Prestamo estudios'),
  ('Educacion', 'Desarrollo', 'variable', 'inversion', true, true, 'Cursos, formacion'),
  ('Viajes', 'Estilo de Vida', 'variable', 'ajuste', false, true, 'Eventos / viajes'),
  ('Regalos', 'Estilo de Vida', 'variable', 'operativo', true, true, 'Regalos'),
  ('Ocio', 'Estilo de Vida', 'variable', 'operativo', true, true, 'Ocio general'),
  ('Otros', 'Ajustes', 'variable', 'operativo', false, true, 'Valvula de escape / alertas'),
  ('Pago nomina', 'Movimientos Financieros', 'fijo', 'transferencia', false, true, 'Movimiento interno'),
  ('Recargas / ajustes financieros', 'Movimientos Financieros', 'variable', 'transferencia', false, true, 'Movimientos tecnicos')
) as v(subcategory, category, expense_type, financial_impact, budgetable, active, comment)
where not exists (
  select 1
  from public.orbita_finance_subcategory_catalog c
  where c.household_id is null
    and lower(trim(c.subcategory)) = lower(trim(v.subcategory))
);

-- -----------------------------------------------------------------------------
-- 3) Cuentas / tarjetas / créditos (hoja Cuentas) — persistencia para sync futuro
-- -----------------------------------------------------------------------------
create table if not exists public.orbita_finance_accounts (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households (id) on delete cascade,
  label text not null,
  account_class text not null check (account_class in ('ahorro', 'tarjeta_credito', 'credito')),
  nature text not null check (nature in ('activo_liquido', 'pasivo_rotativo', 'pasivo_estructural')),
  credit_limit numeric(18, 2),
  balance_used numeric(18, 2),
  balance_available numeric(18, 2),
  manual_balance numeric(18, 2),
  manual_balance_on date,
  owner_user_id uuid references public.users (id) on delete set null,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create index if not exists orbita_finance_accounts_household_idx
  on public.orbita_finance_accounts (household_id)
  where deleted_at is null;

alter table public.orbita_finance_accounts enable row level security;

drop policy if exists "orbita_finance_accounts_household" on public.orbita_finance_accounts;
create policy "orbita_finance_accounts_household"
on public.orbita_finance_accounts
for all
to authenticated
using (
  exists (
    select 1
    from public.users u
    where u.id = auth.uid()
      and u.household_id = orbita_finance_accounts.household_id
  )
)
with check (
  exists (
    select 1
    from public.users u
    where u.id = auth.uid()
      and u.household_id = orbita_finance_accounts.household_id
  )
);

-- Refresca la caché del API (evita PGRST205 justo después de crear tablas)
notify pgrst, 'reload schema';
