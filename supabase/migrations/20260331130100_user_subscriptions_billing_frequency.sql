-- Suscripciones: frecuencia de cobro y día de renovación mensual (además de renewal_date legado).

alter table public.user_subscriptions
  add column if not exists billing_frequency text not null default 'monthly';

alter table public.user_subscriptions drop constraint if exists user_subscriptions_billing_frequency_chk;
alter table public.user_subscriptions
  add constraint user_subscriptions_billing_frequency_chk
  check (billing_frequency in ('weekly', 'monthly', 'semiannual', 'annual'));

alter table public.user_subscriptions
  add column if not exists renewal_day smallint;

update public.user_subscriptions
set renewal_day = least(28, greatest(1, extract(day from renewal_date)::smallint))
where renewal_day is null;

update public.user_subscriptions
set renewal_day = 1
where renewal_day is null;

alter table public.user_subscriptions
  alter column renewal_day set not null;

alter table public.user_subscriptions
  alter column renewal_day set default 1;

alter table public.user_subscriptions drop constraint if exists user_subscriptions_renewal_day_chk;
alter table public.user_subscriptions
  add constraint user_subscriptions_renewal_day_chk check (renewal_day >= 1 and renewal_day <= 28);

notify pgrst, 'reload schema';
