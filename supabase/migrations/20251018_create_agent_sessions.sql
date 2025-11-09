create extension if not exists "uuid-ossp";

create table if not exists public.agent_sessions (
  id uuid primary key default uuid_generate_v4(),
  client_id uuid not null,
  title text null,
  initial_prompt text not null,
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.agent_sessions enable row level security;

do $$
begin
  create policy agent_sessions_select on public.agent_sessions for select using (true);
exception when others then null;
end $$;

do $$
begin
  create policy agent_sessions_insert on public.agent_sessions for insert with check (true);
exception when others then null;
end $$;
