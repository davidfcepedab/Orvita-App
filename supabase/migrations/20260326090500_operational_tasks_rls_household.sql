-- Household-aware RLS for operational_tasks (agenda shared, personal isolated)

-- Drop previous policy (if exists)
drop policy if exists "Users can manage their own tasks"
on public.operational_tasks;

-- Recreate unified policy
create policy "Users can manage their own tasks"
on public.operational_tasks
for all
using (
  (
    domain <> 'agenda'
    and auth.uid() = user_id
  )
  or
  (
    domain = 'agenda'
    and exists (
      select 1
      from public.users u
      where u.id = auth.uid()
        and u.household_id = operational_tasks.household_id
    )
  )
)
with check (
  (
    domain <> 'agenda'
    and auth.uid() = user_id
  )
  or
  (
    domain = 'agenda'
    and exists (
      select 1
      from public.users u
      where u.id = auth.uid()
        and u.household_id = operational_tasks.household_id
    )
  )
);
