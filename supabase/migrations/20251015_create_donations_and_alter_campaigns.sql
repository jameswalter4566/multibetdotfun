-- Add total_received_sol column to campaigns
alter table if exists public.campaigns
  add column if not exists total_received_sol numeric not null default 0;

-- Donations ledger: records on-chain donations per campaign
create table if not exists public.donations (
  id bigserial primary key,
  campaign_id bigint not null references public.campaigns(id) on delete cascade,
  user_id bigint null references public.users(id) on delete set null,
  amount_sol numeric not null,
  is_superchat boolean not null default false,
  tx_signature text null,
  created_at timestamptz not null default now()
);

create index if not exists donations_campaign_idx on public.donations(campaign_id);
create index if not exists donations_created_idx on public.donations(created_at);

-- RLS
alter table public.donations enable row level security;
do $$ begin
  create policy donations_read on public.donations for select using (true);
exception when others then null; end $$;
do $$ begin
  create policy donations_insert on public.donations for insert with check (true);
exception when others then null; end $$;

-- Realtime publication (optional)
do $$ begin
  alter publication supabase_realtime add table public.donations;
exception when others then null; end $$;

