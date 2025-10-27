-- Create campaigns table to track user campaigns
create table if not exists public.campaigns (
  id bigserial primary key,
  user_id bigint not null references public.users(id) on delete cascade,
  title text not null,
  description text not null,
  image_url text null,
  mint_address text null,
  raised_sol numeric not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists campaigns_user_id_idx on public.campaigns(user_id);

-- Enable RLS and permissive policies (adjust later as needed)
alter table public.campaigns enable row level security;
do $$ begin
  create policy campaigns_read for select on public.campaigns using (true);
exception when others then null; end $$;
do $$ begin
  create policy campaigns_insert for insert on public.campaigns with check (true);
exception when others then null; end $$;
do $$ begin
  create policy campaigns_update for update on public.campaigns using (true) with check (true);
exception when others then null; end $$;

-- Ensure realtime publication includes these tables
do $$ begin
  alter publication supabase_realtime add table public.campaigns;
exception when others then null; end $$;
do $$ begin
  alter publication supabase_realtime add table public.users;
exception when others then null; end $$;

