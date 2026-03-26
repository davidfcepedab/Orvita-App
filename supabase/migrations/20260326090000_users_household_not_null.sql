-- Ensure every user has a household and enforce NOT NULL

-- 1) Create missing household for users without one
insert into public.households (id, owner_user_id, created_at)
select gen_random_uuid(), u.id, now()
from public.users u
where u.household_id is null;

-- 2) Attach orphan users to their owned household
update public.users u
set household_id = h.id
from public.households h
where h.owner_user_id = u.id
  and u.household_id is null;

-- 3) Final safety check (abort if still nulls)
do $$
declare
  missing_count integer;
begin
  select count(*) into missing_count
  from public.users
  where household_id is null;

  if missing_count > 0 then
    raise exception 'Users without household_id detected: %', missing_count;
  end if;
end $$;

-- 4) Enforce NOT NULL
alter table public.users
  alter column household_id set not null;
