-- Capital: user-managed subscriptions + manual finance items (additive only).
--
-- RLS (Row Level Security): INTENCIONALMENTE NO HABILITADO en esta migración.
-- Las políticas por household + auth.uid() se añadirán en una migración posterior
-- cuando el modelo de acceso esté cerrado. Hasta entonces, el acceso a estas tablas
-- debe hacerse solo desde rutas API server-side con autenticación (Bearer) y
-- comprobación de household, no desde el cliente anon.
--
-- Tablas nuevas + índices; sin alterar tablas existentes salvo lo estrictamente necesario.

create table if not exists public.user_subscriptions (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households (id) on delete cascade,
  name text not null,
  category text not null,
  amount_monthly numeric(14, 2) not null default 0 check (amount_monthly >= 0),
  renewal_date date not null,
  include_in_simulator boolean not null default true,
  active boolean not null default true,
  status text not null default 'active' check (status in ('active', 'paused', 'cancelled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists user_subscriptions_household_idx
  on public.user_subscriptions (household_id);

create index if not exists user_subscriptions_household_status_idx
  on public.user_subscriptions (household_id, status);

create table if not exists public.household_finance_manual_items (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households (id) on delete cascade,
  item_kind text not null check (item_kind in ('savings', 'credit_card', 'structural_loan')),
  sort_order integer not null default 0,
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists household_finance_manual_items_household_idx
  on public.household_finance_manual_items (household_id, item_kind);
