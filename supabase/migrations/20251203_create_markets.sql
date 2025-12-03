create extension if not exists "uuid-ossp";

create table if not exists public.markets (
  id uuid primary key default gen_random_uuid(),
  ticker text unique,
  title text,
  event_title text,
  status text,
  volume numeric,
  open_interest numeric,
  yes_mint text,
  no_mint text,
  market_ledger text,
  open_time timestamptz,
  close_time timestamptz,
  expiration_time timestamptz,
  result text,
  redemption_status text,
  category text,
  tags text[],
  series_tickers text[],
  price_yes numeric,
  price_no numeric,
  inserted_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists markets_status_idx on public.markets (status);
create index if not exists markets_volume_idx on public.markets (volume);
