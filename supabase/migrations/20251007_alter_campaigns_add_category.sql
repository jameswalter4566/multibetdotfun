-- Add campaign category: 'personal' | 'company'
-- NOTE: If you see "Could not find the 'category' column of 'campaigns'",
-- run this SQL in your Supabase SQL editor.
alter table if exists public.campaigns
  add column if not exists category text not null default 'personal' check (category = any (array['personal','company']));
