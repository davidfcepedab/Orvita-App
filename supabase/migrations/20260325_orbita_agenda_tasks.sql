create table if not exists public.orbita_agenda_tasks (
  id text primary key,
  title text not null,
  status text not null default 'pending' check (status in ('pending', 'in-progress', 'completed')),
  priority text not null default 'Media' check (priority in ('Alta', 'Media', 'Baja')),
  estimated_minutes integer not null default 30,
  due_date date null,
  assignee_id text null,
  assignee_name text null,
  created_by text not null,
  created_at timestamptz not null default now()
);

create index if not exists orbita_agenda_tasks_created_at_idx
  on public.orbita_agenda_tasks (created_at desc);
