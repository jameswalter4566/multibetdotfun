-- Add a flag to distinguish creator fee rows
alter table if exists public.donations
  add column if not exists is_creator_fee boolean not null default false;

