-- Live chat table with realtime for per-campaign messages and super chats
create table if not exists public.live_chat (
  id bigserial primary key,
  campaign_id bigint not null references public.campaigns(id) on delete cascade,
  user_id bigint not null references public.users(id) on delete cascade,
  user_display text null,
  message text not null,
  is_superchat boolean not null default false,
  amount_sol numeric null,
  created_at timestamptz not null default now()
);

create index if not exists live_chat_campaign_idx on public.live_chat(campaign_id);
create index if not exists live_chat_created_idx on public.live_chat(created_at);

alter table public.live_chat enable row level security;

-- Correct policy syntax is: CREATE POLICY name ON table FOR SELECT/INSERT ...
do $$ begin
  create policy live_chat_read on public.live_chat for select using (true);
exception when others then null; end $$;
do $$ begin
  create policy live_chat_insert on public.live_chat for insert with check (true);
exception when others then null; end $$;

do $$ begin
  alter publication supabase_realtime add table public.live_chat;
exception when others then null; end $$;
