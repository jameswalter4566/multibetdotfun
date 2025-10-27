-- Storage bucket for campaign images with permissive policies
select storage.create_bucket('campaigns', public => true);

do $$ begin
  create policy "Public read campaigns"
  on storage.objects for select
  to anon, authenticated
  using (bucket_id = 'campaigns');
exception when others then null; end $$;

do $$ begin
  create policy "Public upload campaigns"
  on storage.objects for insert
  to anon, authenticated
  with check (bucket_id = 'campaigns');
exception when others then null; end $$;

