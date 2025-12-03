alter table public.users
add column if not exists transactions jsonb default '[]'::jsonb;
