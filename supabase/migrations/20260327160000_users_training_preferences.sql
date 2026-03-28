-- Bloque 3 Training: preferencias JSON (objetivo visual, métricas corporales, plan nutricional)
alter table public.users
  add column if not exists training_preferences jsonb not null default '{}'::jsonb;

comment on column public.users.training_preferences is
  'Órbita Training: goalImageUrl, bodyMetrics[], mealPlan[], mealNotes (merge en API).';
