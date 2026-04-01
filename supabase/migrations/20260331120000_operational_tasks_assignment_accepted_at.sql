-- Pending acceptance for agenda tasks assigned to another household member

alter table public.operational_tasks
  add column if not exists assignment_accepted_at timestamptz;

-- Historical assignments: treat as already accepted so nobody gets a stale queue
update public.operational_tasks
set assignment_accepted_at = coalesce(assignment_accepted_at, created_at)
where domain = 'agenda'
  and assignee_id is not null
  and created_by is not null
  and trim(assignee_id) <> ''
  and trim(created_by) <> ''
  and assignee_id <> created_by;
