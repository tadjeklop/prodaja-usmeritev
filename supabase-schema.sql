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

create table if not exists public.discovery_forms (
  id uuid primary key default gen_random_uuid(),
  user_email text not null,
  status text not null default 'draft' check (status in ('draft', 'completed')),
  title text not null default '',
  customer text not null default '',
  contact text not null default '',
  contact_role text not null default '',
  meeting_date date,
  location text not null default '',
  salesperson text not null default '',
  answers jsonb not null default '{}',
  next_steps jsonb not null default '{}',
  reflection jsonb not null default '{}',
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
alter table public.discovery_forms enable row level security;

create or replace function public.is_portal_admin()
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.portal_user_access
    where lower(user_email) = lower(auth.jwt() ->> 'email')
      and is_admin = true
  );
$$;

grant execute on function public.is_portal_admin() to authenticated;

create or replace function public.bootstrap_portal_admin()
returns public.portal_user_access
language plpgsql
security definer
set search_path = public
as $$
declare
  current_email text := lower(auth.jwt() ->> 'email');
  admin_exists boolean;
  result_row public.portal_user_access;
begin
  if current_email is null or current_email = '' then
    raise exception 'Missing authenticated email';
  end if;

  select exists (
    select 1
    from public.portal_user_access
    where is_admin = true
  ) into admin_exists;

  if admin_exists then
    raise exception 'Portal admin already exists';
  end if;

  insert into public.portal_user_access (user_email, profile_id, can_edit_content, is_admin)
  values (current_email, 'admin', true, true)
  on conflict (user_email) do update set
    profile_id = excluded.profile_id,
    can_edit_content = excluded.can_edit_content,
    is_admin = excluded.is_admin,
    updated_at = now()
  returning * into result_row;

  return result_row;
end;
$$;

grant execute on function public.bootstrap_portal_admin() to authenticated;
grant select, insert, update, delete on public.discovery_forms to authenticated;

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
  or public.is_portal_admin()
);

drop policy if exists "admins manage profiles" on public.portal_profiles;
create policy "admins manage profiles"
on public.portal_profiles for all
to authenticated
using (public.is_portal_admin())
with check (public.is_portal_admin());

drop policy if exists "admins manage user access" on public.portal_user_access;
create policy "admins manage user access"
on public.portal_user_access for all
to authenticated
using (public.is_portal_admin())
with check (public.is_portal_admin());

drop policy if exists "users read own discovery forms" on public.discovery_forms;
create policy "users read own discovery forms"
on public.discovery_forms for select
to authenticated
using (
  lower(user_email) = lower(auth.jwt() ->> 'email')
  or public.is_portal_admin()
);

drop policy if exists "users create own discovery forms" on public.discovery_forms;
create policy "users create own discovery forms"
on public.discovery_forms for insert
to authenticated
with check (
  lower(user_email) = lower(auth.jwt() ->> 'email')
  or public.is_portal_admin()
);

drop policy if exists "users update own discovery forms" on public.discovery_forms;
create policy "users update own discovery forms"
on public.discovery_forms for update
to authenticated
using (
  lower(user_email) = lower(auth.jwt() ->> 'email')
  or public.is_portal_admin()
)
with check (
  lower(user_email) = lower(auth.jwt() ->> 'email')
  or public.is_portal_admin()
);

drop policy if exists "users delete own discovery forms" on public.discovery_forms;
create policy "users delete own discovery forms"
on public.discovery_forms for delete
to authenticated
using (
  lower(user_email) = lower(auth.jwt() ->> 'email')
  or public.is_portal_admin()
);
