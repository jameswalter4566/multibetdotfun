create table if not exists public.users (
  id bigserial not null,
  username text not null,
  userdid text not null,
  screename text null,
  created_at timestamp with time zone not null default now(),
  screen_name text null,
  profile_picture_url text null,
  bio text null,
  banner_url text null,
  last_login timestamp with time zone null,
  followers integer not null default 0,
  auth_method text not null default 'phantom'::text,
  x_user_id text null,
  x_username text null,
  wallet_public_key text null,
  wallet_private_key text null,
  constraint users_pkey primary key (id),
  constraint users_userdid_key unique (userdid),
  constraint users_username_key unique (username),
  constraint users_x_user_id_key unique (x_user_id),
  constraint users_auth_method_check check (
    (
      auth_method = any (array['phantom'::text, 'x'::text])
    )
  )
)
TABLESPACE pg_default;

-- Optional: grant minimal RLS policies (adjust to taste)
alter table public.users enable row level security;
do $$ begin
  create policy users_read for select on public.users using (true);
exception when others then null; end $$;
do $$ begin
  create policy users_insert for insert on public.users with check (true);
exception when others then null; end $$;
do $$ begin
  create policy users_update for update on public.users using (true) with check (true);
exception when others then null; end $$;
