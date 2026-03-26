-- Consolidate orbita_agenda_tasks into operational_tasks (idempotent, production-safe)

-- 1) Extend operational_tasks for agenda compatibility
alter table public.operational_tasks
  add column if not exists status text,
  add column if not exists priority text,
  add column if not exists estimated_minutes integer,
  add column if not exists due_date date,
  add column if not exists assignee_id text,
  add column if not exists assignee_name text,
  add column if not exists created_by text,
  add column if not exists legacy_orbita_id text;

-- Defaults and not-null normalization for new columns (safe)
update public.operational_tasks
set status = coalesce(status, 'pending'),
    priority = coalesce(priority, 'Media'),
    estimated_minutes = coalesce(estimated_minutes, 30)
where status is null or priority is null or estimated_minutes is null;

alter table public.operational_tasks
  alter column status set default 'pending',
  alter column priority set default 'Media',
  alter column estimated_minutes set default 30;

-- 2) Expand domain constraint to include 'agenda'
alter table public.operational_tasks
  drop constraint if exists operational_tasks_domain_check;

alter table public.operational_tasks
  add constraint operational_tasks_domain_check
  check (domain in ('salud', 'fisico', 'profesional', 'agenda'));

-- 3) Enforce agenda-specific constraints
alter table public.operational_tasks
  drop constraint if exists operational_tasks_status_check;

alter table public.operational_tasks
  add constraint operational_tasks_status_check
  check (status in ('pending', 'in-progress', 'completed'));

alter table public.operational_tasks
  drop constraint if exists operational_tasks_priority_check;

alter table public.operational_tasks
  add constraint operational_tasks_priority_check
  check (priority in ('Alta', 'Media', 'Baja'));

create unique index if not exists operational_tasks_legacy_orbita_id_uniq
  on public.operational_tasks (legacy_orbita_id)
  where legacy_orbita_id is not null;

create index if not exists operational_tasks_domain_idx
  on public.operational_tasks (domain);

create index if not exists operational_tasks_created_at_idx
  on public.operational_tasks (created_at desc);

-- 4) Agenda access: allow assignees to read/update agenda tasks
drop policy if exists "Agenda assignees can access tasks" on public.operational_tasks;
drop policy if exists "Agenda assignees can update tasks" on public.operational_tasks;

create policy "Agenda assignees can access tasks"
on public.operational_tasks
for select
using (
  (auth.uid() = user_id)
  or (domain = 'agenda' and auth.uid()::text = assignee_id)
);

create policy "Agenda assignees can update tasks"
on public.operational_tasks
for update
using (
  (auth.uid() = user_id)
  or (domain = 'agenda' and auth.uid()::text = assignee_id)
);

-- 5) Backfill data from orbita_agenda_tasks (idempotent)
insert into public.operational_tasks (
  user_id,
  title,
  completed,
  domain,
  created_at,
  status,
  priority,
  estimated_minutes,
  due_date,
  assignee_id,
  assignee_name,
  created_by,
  legacy_orbita_id
)
select
  coalesce(u.id, ua.id),
  oat.title,
  (oat.status = 'completed'),
  'agenda',
  oat.created_at,
  oat.status,
  oat.priority,
  oat.estimated_minutes,
  oat.due_date,
  oat.assignee_id,
  oat.assignee_name,
  oat.created_by,
  oat.id
from public.orbita_agenda_tasks oat
left join public.users u on u.id::text = oat.created_by
left join public.users ua on ua.id::text = oat.assignee_id
where not exists (
  select 1 from public.operational_tasks ot
  where ot.legacy_orbita_id = oat.id
);

-- 6) Basic validation (notice only)
do $$
declare
  legacy_count bigint;
  migrated_count bigint;
begin
  select count(*) into legacy_count from public.orbita_agenda_tasks;
  select count(*) into migrated_count from public.operational_tasks where domain = 'agenda';
  raise notice 'orbita_agenda_tasks rows=%', legacy_count;
  raise notice 'operational_tasks agenda rows=%', migrated_count;
end $$;

-- 7) Archive legacy table (no drop)
alter table if exists public.orbita_agenda_tasks
  rename to orbita_agenda_tasks__archive;
