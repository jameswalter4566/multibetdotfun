-- Create a public storage bucket for profile pictures and permissive RLS policies
-- Safe to re-run: policy creation is wrapped to ignore duplicates

-- Ensure the bucket exists (idempotent in practice on Supabase)
select storage.create_bucket('profilepics', public => true);

-- Allow public read of objects in the bucket
do $$ begin
  create policy "Public read profilepics"
  on storage.objects for select
  to anon, authenticated
  using (bucket_id = 'profilepics');
exception when others then null; end $$;

-- Allow public uploads (INSERT) into the bucket
do $$ begin
  create policy "Public upload profilepics"
  on storage.objects for insert
  to anon, authenticated
  with check (bucket_id = 'profilepics');
exception when others then null; end $$;

-- Optional hardening: restrict uploads to the avatars/ prefix
-- Uncomment to enforce
-- do $$ begin
--   alter policy "Public upload profilepics"
--   on storage.objects
--   using (bucket_id = 'profilepics')
--   with check (bucket_id = 'profilepics' and position('avatars/' in name) = 1);
-- exception when others then null; end $$;

