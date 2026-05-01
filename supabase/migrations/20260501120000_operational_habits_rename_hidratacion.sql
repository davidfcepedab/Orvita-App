-- Nombre más corto del hábito de agua (idempotente)
update public.operational_habits
set name = 'Hidratación'
where name = 'Hidratación Estratégica'
  and coalesce(metadata ->> 'habit_type', '') = 'water-tracking';
