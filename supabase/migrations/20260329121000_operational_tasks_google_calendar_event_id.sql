-- Link agenda tasks to Google Calendar events created from Órvita

alter table public.operational_tasks
  add column if not exists google_calendar_event_id text;

create unique index if not exists operational_tasks_agenda_google_cal_evt_uniq
  on public.operational_tasks (user_id, google_calendar_event_id)
  where google_calendar_event_id is not null and domain = 'agenda';
