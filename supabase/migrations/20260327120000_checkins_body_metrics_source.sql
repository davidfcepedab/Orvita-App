-- Additive-only: extend checkins for full form corporal measures + Sheets provenance.
-- Existing columns (score_global, score_fisico, score_salud, score_profesional, etc.) unchanged.

alter table public.checkins
  add column if not exists body_metrics jsonb not null default '{}'::jsonb;

alter table public.checkins
  add column if not exists sheet_row_id text;

alter table public.checkins
  add column if not exists source text not null default 'sheets';

alter table public.checkins
  add column if not exists notes text;

comment on column public.checkins.body_metrics is
  'JSON object with corporal measures (peso, % grasa, perímetros, etc.) and optional additive keys (e.g. fecha reportada).';

comment on column public.checkins.sheet_row_id is
  'Identifies the spreadsheet row used for preload/sync (e.g. 1-based row index or opaque Sheets id).';

comment on column public.checkins.source is
  'Origin of the check-in row: sheets (imported or preloaded from Google Sheets) or manual (captured only in-app).';

comment on column public.checkins.notes is
  'Free-form notes or serialized context for the check-in (additive; optional).';

-- ── ÓRBITA V3 – BLOQUE 1 CHECK-IN ──
-- [ ] Lectura última hoja Google Sheets implementada
-- [ ] Precarga del formulario funcional
-- [ ] POST /api/checkin guarda medidas corporales
-- [ ] Compatible con modo mock
-- [ ] Estrategia additive respetada
-- [ ] Fidelidad visual y navegación preservada
