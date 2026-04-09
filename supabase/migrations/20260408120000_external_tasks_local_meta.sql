-- Metadatos locales en recordatorios Google (Tasks): Google no expone prioridad ni responsable del hogar.
alter table public.external_tasks
  add column if not exists local_assignee_user_id uuid references auth.users (id) on delete set null,
  add column if not exists local_priority text;

comment on column public.external_tasks.local_assignee_user_id is 'Responsable del hogar (Órvita); no se sincroniza con Google Tasks.';
comment on column public.external_tasks.local_priority is 'Prioridad local Alta|Media|Baja; no existe en Google Tasks.';
