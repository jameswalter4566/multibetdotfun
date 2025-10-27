-- Add website and X (twitter) URLs to campaigns
alter table if exists public.campaigns
  add column if not exists website_url text null,
  add column if not exists x_url text null;

