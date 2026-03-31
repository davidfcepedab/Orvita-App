-- Compromisos: día del mes fijo (todos los meses) + subcategoría; due_date opcional (legado).

alter table public.user_flow_commitments
  add column if not exists due_day smallint;

alter table public.user_flow_commitments
  add column if not exists subcategory text not null default '';

update public.user_flow_commitments
set due_day = least(31, greatest(1, extract(day from due_date)::smallint))
where due_day is null;

update public.user_flow_commitments
set due_day = 1
where due_day is null;

alter table public.user_flow_commitments
  alter column due_day set not null;

alter table public.user_flow_commitments
  alter column due_day set default 1;

alter table public.user_flow_commitments drop constraint if exists user_flow_commitments_due_day_chk;
alter table public.user_flow_commitments
  add constraint user_flow_commitments_due_day_chk check (due_day >= 1 and due_day <= 31);

alter table public.user_flow_commitments
  alter column due_date drop not null;

notify pgrst, 'reload schema';
