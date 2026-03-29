-- Link agenda operational_tasks to Google Tasks for bidirectional sync

alter table public.operational_tasks
  add column if not exists google_task_id text;

create unique index if not exists operational_tasks_agenda_google_task_uniq
  on public.operational_tasks (user_id, google_task_id)
  where google_task_id is not null and domain = 'agenda';
