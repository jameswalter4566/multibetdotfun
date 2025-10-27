-- Add donation goal to campaigns
-- NOTE: If you see "column campaigns.goal_sol does not exist",
-- run this SQL in your Supabase SQL editor.
alter table if exists public.campaigns
  add column if not exists goal_sol numeric not null default 0;
