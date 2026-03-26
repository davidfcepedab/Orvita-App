-- Fix: make users RLS policy idempotent

-- Ensure RLS is enabled
alter table public.users enable row level security;

-- Drop policy if it already exists
drop policy if exists "Users can manage their profile" on public.users;

-- Recreate policy
create policy "Users can manage their profile"
on public.users
for all
using (auth.uid() = id)
with check (auth.uid() = id);
