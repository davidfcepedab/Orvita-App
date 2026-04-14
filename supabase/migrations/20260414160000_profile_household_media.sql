-- Avatar por usuario + foto familiar del hogar + bucket público de lectura para URLs en <img>

alter table public.users
  add column if not exists avatar_url text;

alter table public.households
  add column if not exists family_photo_url text;

comment on column public.users.avatar_url is 'URL pública (p. ej. Storage) del avatar del usuario en Órvita.';
comment on column public.households.family_photo_url is 'URL pública de la imagen representativa del hogar.';

insert into storage.buckets (id, name, public)
values ('orbita-media', 'orbita-media', true)
on conflict (id) do update
set public = excluded.public;

drop policy if exists "Public read orbita-media objects" on storage.objects;

create policy "Public read orbita-media objects"
on storage.objects
for select
to public
using (bucket_id = 'orbita-media');
