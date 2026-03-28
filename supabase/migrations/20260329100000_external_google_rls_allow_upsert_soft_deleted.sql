-- Google sync upsert must see rows with deleted_at set (reactivate / update cancelled events & tasks).
-- Previous policy hid soft-deleted rows from USING, breaking ON CONFLICT UPDATE for those keys.

drop policy if exists "Users can access their calendar events" on public.external_calendar_events;
create policy "Users can access their calendar events"
on public.external_calendar_events
for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Users can access their external tasks" on public.external_tasks;
create policy "Users can access their external tasks"
on public.external_tasks
for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);
