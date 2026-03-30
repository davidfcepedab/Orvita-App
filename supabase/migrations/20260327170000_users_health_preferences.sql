-- Bloque 4 Salud: suplementos y ajustes UI persistidos (jsonb)
alter table public.users
  add column if not exists health_preferences jsonb not null default '{}'::jsonb;

comment on column public.users.health_preferences is
  'Órvita Health: supplements[], etc. (merge vía API).';
