-- Tareas de agenda visibles para todo el hogar (una fila, compartida).
-- Sigue el modelo "household" (no multi-asignatario en la misma fila).

alter table public.operational_tasks
  add column if not exists household_shared boolean not null default false;

comment on column public.operational_tasks.household_shared is
  'Agenda: si es true, todos los usuarios del mismo household_id pueden leer y actualizar la tarea (compartida del hogar).';

-- Reemplazar políticas de agenda (extensión de 20260407120000_operational_tasks_agenda_privacy_rls.sql)

drop policy if exists "operational_tasks_select_scope" on public.operational_tasks;
drop policy if exists "operational_tasks_insert_scope" on public.operational_tasks;
drop policy if exists "operational_tasks_update_scope" on public.operational_tasks;
drop policy if exists "operational_tasks_delete_scope" on public.operational_tasks;

create policy "operational_tasks_select_scope"
on public.operational_tasks
for select
using (
  (
    deleted_at is null
    and domain is distinct from 'agenda'
    and auth.uid() = user_id
  )
  or
  (
    deleted_at is null
    and domain = 'agenda'
    and (
      auth.uid() = user_id
      or (
        assignee_id is not null
        and btrim(assignee_id) <> ''
        and assignee_id = auth.uid()::text
      )
      or (
        household_shared is true
        and household_id is not null
        and exists (
          select 1
          from public.users u
          where u.id = auth.uid()
            and u.household_id = operational_tasks.household_id
        )
      )
    )
  )
);

create policy "operational_tasks_insert_scope"
on public.operational_tasks
for insert
with check (
  auth.uid() = user_id
  and (
    domain is distinct from 'agenda'
    or (
      household_id is not null
      and exists (
        select 1
        from public.users u
        where u.id = auth.uid()
          and u.household_id = operational_tasks.household_id
      )
    )
  )
);

create policy "operational_tasks_update_scope"
on public.operational_tasks
for update
using (
  (
    deleted_at is null
    and domain is distinct from 'agenda'
    and auth.uid() = user_id
  )
  or
  (
    deleted_at is null
    and domain = 'agenda'
    and (
      auth.uid() = user_id
      or (
        assignee_id is not null
        and btrim(assignee_id) <> ''
        and assignee_id = auth.uid()::text
      )
      or (
        household_shared is true
        and household_id is not null
        and exists (
          select 1
          from public.users u
          where u.id = auth.uid()
            and u.household_id = operational_tasks.household_id
        )
      )
    )
  )
)
with check (
  auth.uid() = user_id
  or (
    domain = 'agenda'
    and assignee_id is not null
    and btrim(assignee_id) <> ''
    and assignee_id = auth.uid()::text
    and household_id is not null
    and exists (
      select 1
      from public.users u
      where u.id = auth.uid()
        and u.household_id = operational_tasks.household_id
    )
  )
  or (
    domain = 'agenda'
    and household_shared is true
    and household_id is not null
    and exists (
      select 1
      from public.users u
      where u.id = auth.uid()
        and u.household_id = operational_tasks.household_id
    )
  )
);

create policy "operational_tasks_delete_scope"
on public.operational_tasks
for delete
using (
  deleted_at is null
  and (
    (
      domain is distinct from 'agenda'
      and auth.uid() = user_id
    )
    or
    (
      domain = 'agenda'
      and (
        auth.uid() = user_id
        or (
          assignee_id is not null
          and btrim(assignee_id) <> ''
          and assignee_id = auth.uid()::text
          and assignment_accepted_at is not null
        )
      )
    )
  )
);
