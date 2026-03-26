-- Cleanup obsolete agenda assignee policies (household-only model)

drop policy if exists "Agenda assignees can access tasks" on public.operational_tasks;
drop policy if exists "Agenda assignees can update tasks" on public.operational_tasks;
