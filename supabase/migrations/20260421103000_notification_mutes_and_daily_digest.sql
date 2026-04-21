-- Preferencias avanzadas de push: mute temporal por categoría + digest diario.

alter table public.orbita_notification_preferences
  add column if not exists push_digest_daily boolean not null default false,
  add column if not exists mute_until_palanca timestamptz,
  add column if not exists mute_until_presion_critica timestamptz,
  add column if not exists mute_until_energia timestamptz,
  add column if not exists mute_until_habitos timestamptz;
