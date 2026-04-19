-- One logical check-in per user per calendar day (fecha del formulario).
-- Enables upsert on POST /api/checkin; legacy rows sin fecha quedan con reported_date null.

alter table public.checkins
  add column if not exists reported_date date;

alter table public.checkins
  add column if not exists updated_at timestamptz;

update public.checkins
set updated_at = coalesce(updated_at, created_at);

alter table public.checkins
  alter column updated_at set default now();

alter table public.checkins
  alter column updated_at set not null;

comment on column public.checkins.reported_date is
  'Calendar day (YYYY-MM-DD) del check-in según el formulario; clave de fusión con el usuario.';

comment on column public.checkins.updated_at is
  'Última escritura del registro; usar junto a created_at para ordenar el check-in más reciente tras fusión por día.';

-- Backfill desde body_metrics (additive desde bloque check-in).
update public.checkins c
set reported_date = (c.body_metrics->>'fecha_reportada')::date
where c.reported_date is null
  and c.body_metrics ? 'fecha_reportada'
  and (c.body_metrics->>'fecha_reportada') ~ '^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12][0-9]|3[01])$';

-- Quitar duplicados previos: conservar la fila más reciente por (user_id, reported_date).
delete from public.checkins c
using (
  select id
  from (
    select id,
      row_number() over (
        partition by user_id, reported_date
        order by created_at desc nulls last
      ) as rn
    from public.checkins
    where reported_date is not null
  ) ranked
  where rn > 1
) d
where c.id = d.id;

create unique index if not exists checkins_user_reported_date_uidx
  on public.checkins (user_id, reported_date);
