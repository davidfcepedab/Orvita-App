-- Households invite codes (idempotent)

create extension if not exists "pgcrypto";

alter table public.households
  add column if not exists invite_code text unique;

update public.households
set invite_code = substr(replace(gen_random_uuid()::text, '-', ''), 1, 12)
where invite_code is null;

alter table public.households
  alter column invite_code set not null;

alter table public.households
  enable row level security;

drop policy if exists "Household members can access households"
on public.households;

create policy "Household members can access households"
on public.households
for select
using (
  exists (
    select 1
    from public.users u
    where u.id = auth.uid()
      and u.household_id = households.id
  )
);
