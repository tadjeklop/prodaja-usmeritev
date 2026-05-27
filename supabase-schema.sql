-- Interzero EPR portal auth/profile schema for Supabase.
-- Run this in Supabase SQL editor, then create users in Authentication > Users.

create table if not exists public.portal_profiles (
  id text primary key,
  name text not null,
  role text not null check (role in ('admin', 'editor', 'viewer')),
  default_language text not null check (default_language in ('sl', 'hr', 'sr')),
  markets text[] not null default '{}',
  enabled_modules text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.portal_user_access (
  user_email text primary key,
  profile_id text not null references public.portal_profiles(id) on delete restrict,
  can_edit_content boolean not null default false,
  is_admin boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into public.portal_profiles (id, name, role, default_language, markets, enabled_modules)
values
  ('admin', 'Admin', 'admin', 'sl', array['sl','hr','sr'], array['index','dashboard','stranke','segmentacija','vodic','roleplay','priprava','obrazec','govori','ugovori','konkurenca','reference','kalkulacije','ponudba','proces','glosar','koledar','vsebine','zakonodaja','onboarding','kpi','asistent','zgodovina','settings']),
  ('sl-prodaja', 'Slovenija prodaja', 'viewer', 'sl', array['sl'], array['index','stranke','segmentacija','vodic','roleplay','priprava','obrazec','govori','ugovori','konkurenca','reference','kalkulacije','ponudba','proces','glosar','koledar','vsebine','zakonodaja','settings']),
  ('hr-prodaja', 'Hrvatska prodaja', 'editor', 'hr', array['hr'], array['index','stranke','segmentacija','vodic','roleplay','priprava','obrazec','govori','ugovori','konkurenca','reference','kalkulacije','ponudba','proces','glosar','koledar','vsebine','zakonodaja','settings']),
  ('sr-prodaja', 'Srbija prodaja', 'editor', 'sr', array['sr'], array['index','stranke','segmentacija','vodic','roleplay','priprava','obrazec','govori','ugovori','konkurenca','reference','kalkulacije','ponudba','proces','glosar','koledar','vsebine','zakonodaja','settings'])
on conflict (id) do nothing;

alter table public.portal_profiles enable row level security;
alter table public.portal_user_access enable row level security;

drop policy if exists "profiles visible to signed in users" on public.portal_profiles;
create policy "profiles visible to signed in users"
on public.portal_profiles for select
to authenticated
using (true);

drop policy if exists "users see own access" on public.portal_user_access;
create policy "users see own access"
on public.portal_user_access for select
to authenticated
using (
  lower(user_email) = lower(auth.jwt() ->> 'email')
  or exists (
    select 1
    from public.portal_user_access admin_access
    where lower(admin_access.user_email) = lower(auth.jwt() ->> 'email')
      and admin_access.is_admin = true
  )
);

drop policy if exists "admins manage profiles" on public.portal_profiles;
create policy "admins manage profiles"
on public.portal_profiles for all
to authenticated
using (
  exists (
    select 1
    from public.portal_user_access admin_access
    where lower(admin_access.user_email) = lower(auth.jwt() ->> 'email')
      and admin_access.is_admin = true
  )
)
with check (
  exists (
    select 1
    from public.portal_user_access admin_access
    where lower(admin_access.user_email) = lower(auth.jwt() ->> 'email')
      and admin_access.is_admin = true
  )
);

drop policy if exists "admins manage user access" on public.portal_user_access;
create policy "admins manage user access"
on public.portal_user_access for all
to authenticated
using (
  exists (
    select 1
    from public.portal_user_access admin_access
    where lower(admin_access.user_email) = lower(auth.jwt() ->> 'email')
      and admin_access.is_admin = true
  )
)
with check (
  exists (
    select 1
    from public.portal_user_access admin_access
    where lower(admin_access.user_email) = lower(auth.jwt() ->> 'email')
      and admin_access.is_admin = true
  )
);
