-- Idempotente: asegura columnas de mute/digest si un despliegue saltó migraciones anteriores.
-- Corrige error en UI: "Could not find the 'mute_until_energia' column ... in the schema cache"

alter table public.orbita_notification_preferences
  add column if not exists push_digest_daily boolean not null default false,
  add column if not exists mute_until_palanca timestamptz,
  add column if not exists mute_until_presion_critica timestamptz,
  add column if not exists mute_until_energia timestamptz,
  add column if not exists mute_until_habitos timestamptz;
