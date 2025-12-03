alter table public.users
  add column if not exists parlay_picks jsonb default '[]'::jsonb,
  add column if not exists signed_in_at timestamptz default now();
