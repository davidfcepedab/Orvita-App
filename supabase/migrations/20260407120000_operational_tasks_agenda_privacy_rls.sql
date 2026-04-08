-- Agenda: dejar de exponer todas las tareas del hogar vía RLS.
-- Solo el dueño de la fila (user_id) o el asignatario (assignee_id) acceden a domain = 'agenda'.
-- Resto de dominios: solo user_id = auth.uid().

drop policy if exists "Users can manage their own tasks" on public.operational_tasks;
drop policy if exists "Agenda household members can access tasks" on public.operational_tasks;
drop policy if exists "Agenda household members can update tasks" on public.operational_tasks;

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
