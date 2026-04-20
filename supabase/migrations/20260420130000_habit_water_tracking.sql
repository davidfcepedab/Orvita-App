-- Seguimiento de agua (ml) por día en habit_completions + hábito por defecto para todos los usuarios.

alter table public.habit_completions
  add column if not exists water_ml integer;

comment on column public.habit_completions.water_ml is
  'Para habit_type water-tracking: ml consumidos ese día. Día "cumplido" si water_ml >= meta del hábito.';

-- Hábito por defecto: una fila por usuario que aún no tenga water-tracking
insert into public.operational_habits (user_id, name, completed, domain, metadata)
select
  u.id,
  'Hidratación Estratégica',
  false,
  'salud',
  jsonb_build_object(
    'habit_type', 'water-tracking',
    'frequency', 'diario',
    'weekdays', jsonb_build_array(0, 1, 2, 3, 4, 5, 6),
    'display_days', jsonb_build_array('L', 'M', 'X', 'J', 'V', 'S', 'D'),
    'trigger_or_time', 'Sistema Órvita · ritmo hacia tu meta diaria de ml',
    'intention', 'Convertir hidratación en un ritual medible sin fricción.',
    'water_bottle_ml', 750,
    'water_goal_ml', 2400,
    'water_glass_ml', 250
  )
from public.users u
where not exists (
  select 1
  from public.operational_habits h
  where h.user_id = u.id
    and coalesce(h.metadata ->> 'habit_type', '') = 'water-tracking'
);
