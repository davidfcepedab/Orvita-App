-- Enforce RLS on orbita_agenda_tasks and reapply policies (idempotent)

alter table public.orbita_agenda_tasks enable row level security;

drop policy if exists "Users can view their own tasks" on public.orbita_agenda_tasks;
drop policy if exists "Users can insert their own tasks" on public.orbita_agenda_tasks;
drop policy if exists "Users can update their own tasks" on public.orbita_agenda_tasks;
drop policy if exists "Users can delete their own tasks" on public.orbita_agenda_tasks;

create policy "Users can view their own tasks"
on public.orbita_agenda_tasks
for select
using (
  auth.uid()::text = created_by
  or auth.uid()::text = assignee_id
);

create policy "Users can insert their own tasks"
on public.orbita_agenda_tasks
for insert
with check (
  auth.uid()::text = created_by
);

create policy "Users can update their own tasks"
on public.orbita_agenda_tasks
for update
using (
  auth.uid()::text = created_by
  or auth.uid()::text = assignee_id
);

create policy "Users can delete their own tasks"
on public.orbita_agenda_tasks
for delete
using (
  auth.uid()::text = created_by
);
