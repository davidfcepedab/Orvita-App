-- Alinear dominio de hábitos con operational_tasks y tipos TS (incluye 'agenda').
alter table public.operational_habits
  drop constraint if exists operational_habits_domain_check;

alter table public.operational_habits
  add constraint operational_habits_domain_check
  check (domain in ('salud', 'fisico', 'profesional', 'agenda'));
