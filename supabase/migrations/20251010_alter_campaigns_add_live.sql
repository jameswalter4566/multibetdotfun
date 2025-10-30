-- Add realtime broadcast fields to campaigns (no separate streams table)
alter table if exists public.campaigns
  add column if not exists channel_name text,
  add column if not exists is_live boolean not null default false,
  add column if not exists started_at timestamptz null,
  add column if not exists viewers_est integer not null default 0;
