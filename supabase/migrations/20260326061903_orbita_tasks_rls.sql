

-- Orvita v1.1.0: Harden RLS policies for orbita_agenda_tasks (idempotent)

-- Enable Row Level Security
alter table public.orbita_agenda_tasks enable row level security;

-- Drop policies if they already exist (idempotent)
drop policy if exists "Users can view their own tasks" on public.orbita_agenda_tasks;
drop policy if exists "Users can insert their own tasks" on public.orbita_agenda_tasks;
drop policy if exists "Users can update their own tasks" on public.orbita_agenda_tasks;
drop policy if exists "Users can delete their own tasks" on public.orbita_agenda_tasks;

-- SELECT: Users can view tasks where they are creator or assignee
create policy "Users can view their own tasks"
on public.orbita_agenda_tasks
for select
using (
  auth.uid()::text = created_by
  or auth.uid()::text = assignee_id
);

-- INSERT: Users can create tasks only if they are the creator
create policy "Users can insert their own tasks"
on public.orbita_agenda_tasks
for insert
with check (
  auth.uid()::text = created_by
);

-- UPDATE: Users can update tasks where they are creator or assignee
create policy "Users can update their own tasks"
on public.orbita_agenda_tasks
for update
using (
  auth.uid()::text = created_by
  or auth.uid()::text = assignee_id
);

-- DELETE: Only creators can delete tasks
create policy "Users can delete their own tasks"
on public.orbita_agenda_tasks
for delete
using (
  auth.uid()::text = created_by
);