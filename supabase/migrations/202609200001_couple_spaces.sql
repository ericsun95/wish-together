create schema if not exists private;

create table public.couple_spaces (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(trim(name)) between 1 and 80),
  owner_id uuid not null references auth.users(id),
  created_at timestamptz not null default now()
);

create table public.space_members (
  space_id uuid not null references public.couple_spaces(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('owner', 'partner')),
  joined_at timestamptz not null default now(),
  primary key (space_id, user_id),
  unique (user_id)
);

create unique index one_owner_per_space on public.space_members (space_id) where role = 'owner';

create table public.space_invitations (
  id uuid primary key default gen_random_uuid(),
  space_id uuid not null references public.couple_spaces(id) on delete cascade,
  token uuid not null unique default gen_random_uuid(),
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '7 days'),
  accepted_at timestamptz,
  revoked_at timestamptz
);

create table public.wishes (
  id uuid primary key default gen_random_uuid(),
  space_id uuid not null references public.couple_spaces(id) on delete cascade,
  created_by uuid not null references auth.users(id),
  title text not null,
  note text not null default '',
  url text not null,
  status text not null default 'wanted' check (status in ('wanted', 'planned', 'done')),
  planned_date date,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  unique (id, space_id)
);

create index wishes_by_space on public.wishes (space_id, created_at desc);

create table public.checkins (
  id uuid primary key default gen_random_uuid(),
  space_id uuid not null references public.couple_spaces(id) on delete cascade,
  wish_id uuid not null,
  created_by uuid not null references auth.users(id),
  completed_on date not null default current_date,
  note text not null default '',
  created_at timestamptz not null default now(),
  foreign key (wish_id, space_id) references public.wishes(id, space_id) on delete cascade
);

create index checkins_by_space on public.checkins (space_id, created_at desc);

create function private.is_space_member(p_space_id uuid)
returns boolean
language sql stable security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.space_members
    where space_id = p_space_id and user_id = (select auth.uid())
  );
$$;

alter table public.couple_spaces enable row level security;
alter table public.space_members enable row level security;
alter table public.space_invitations enable row level security;
alter table public.wishes enable row level security;
alter table public.checkins enable row level security;

create policy "members read their space" on public.couple_spaces
for select to authenticated using (private.is_space_member(id));

create policy "members read their members" on public.space_members
for select to authenticated using (private.is_space_member(space_id));

create policy "members read wishes" on public.wishes
for select to authenticated using (private.is_space_member(space_id));

create policy "members add wishes" on public.wishes
for insert to authenticated with check (
  private.is_space_member(space_id) and created_by = (select auth.uid())
);

create policy "members update wishes" on public.wishes
for update to authenticated using (private.is_space_member(space_id))
with check (private.is_space_member(space_id));

create policy "members delete wishes" on public.wishes
for delete to authenticated using (private.is_space_member(space_id));

create policy "members read checkins" on public.checkins
for select to authenticated using (private.is_space_member(space_id));

create policy "members add checkins" on public.checkins
for insert to authenticated with check (
  private.is_space_member(space_id) and created_by = (select auth.uid())
);

create policy "members update checkins" on public.checkins
for update to authenticated using (private.is_space_member(space_id))
with check (private.is_space_member(space_id));

create policy "members delete checkins" on public.checkins
for delete to authenticated using (private.is_space_member(space_id));

create function private.create_couple_space(p_name text)
returns uuid
language plpgsql security definer
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
  v_space uuid;
begin
  if v_user is null then raise exception 'Authentication required'; end if;
  if p_name is null or char_length(trim(p_name)) not between 1 and 80 then
    raise exception 'Invalid space name';
  end if;
  if exists (select 1 from public.space_members where user_id = v_user) then
    raise exception 'Already in a space';
  end if;

  insert into public.couple_spaces (name, owner_id)
  values (trim(p_name), v_user) returning id into v_space;
  insert into public.space_members (space_id, user_id, role)
  values (v_space, v_user, 'owner');
  return v_space;
end;
$$;

create function private.create_space_invitation()
returns uuid
language plpgsql security definer
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
  v_space uuid;
  v_token uuid;
begin
  if v_user is null then raise exception 'Authentication required'; end if;
  select space_id into v_space from public.space_members
  where user_id = v_user and role = 'owner';
  if v_space is null then raise exception 'Only the owner can invite'; end if;

  perform 1 from public.couple_spaces where id = v_space for update;
  if (select count(*) from public.space_members where space_id = v_space) >= 2 then
    raise exception 'Space is full';
  end if;

  update public.space_invitations set revoked_at = now()
  where space_id = v_space and accepted_at is null and revoked_at is null;
  insert into public.space_invitations (space_id, created_by)
  values (v_space, v_user) returning token into v_token;
  return v_token;
end;
$$;

create function private.revoke_space_invitations()
returns void
language plpgsql security definer
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
  v_space uuid;
begin
  if v_user is null then raise exception 'Authentication required'; end if;
  select space_id into v_space from public.space_members
  where user_id = v_user and role = 'owner';
  if v_space is null then raise exception 'Only the owner can revoke invitations'; end if;
  update public.space_invitations set revoked_at = now()
  where space_id = v_space and accepted_at is null and revoked_at is null;
end;
$$;

create function private.accept_space_invitation(p_token uuid)
returns uuid
language plpgsql security definer
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
  v_space uuid;
  v_invitation public.space_invitations%rowtype;
begin
  if v_user is null then raise exception 'Authentication required'; end if;
  if exists (select 1 from public.space_members where user_id = v_user) then
    raise exception 'Already in a space';
  end if;

  select space_id into v_space from public.space_invitations where token = p_token;
  if v_space is null then raise exception 'Invitation is unavailable'; end if;
  perform 1 from public.couple_spaces where id = v_space for update;
  select * into v_invitation from public.space_invitations
  where token = p_token for update;
  if not found or v_invitation.revoked_at is not null or
     v_invitation.accepted_at is not null or v_invitation.expires_at <= now() then
    raise exception 'Invitation is unavailable';
  end if;

  if (select count(*) from public.space_members where space_id = v_invitation.space_id) >= 2 then
    raise exception 'Space is full';
  end if;

  insert into public.space_members (space_id, user_id, role)
  values (v_invitation.space_id, v_user, 'partner');
  update public.space_invitations set accepted_at = now()
  where id = v_invitation.id;
  return v_invitation.space_id;
end;
$$;

create function public.create_couple_space(p_name text) returns uuid
language sql security invoker set search_path = ''
as $$ select private.create_couple_space(p_name) $$;
create function public.create_space_invitation() returns uuid
language sql security invoker set search_path = ''
as $$ select private.create_space_invitation() $$;
create function public.revoke_space_invitations() returns void
language sql security invoker set search_path = ''
as $$ select private.revoke_space_invitations() $$;
create function public.accept_space_invitation(p_token uuid) returns uuid
language sql security invoker set search_path = ''
as $$ select private.accept_space_invitation(p_token) $$;

revoke all on function private.is_space_member(uuid) from public, anon;
revoke all on function private.create_couple_space(text) from public, anon;
revoke all on function private.create_space_invitation() from public, anon;
revoke all on function private.revoke_space_invitations() from public, anon;
revoke all on function private.accept_space_invitation(uuid) from public, anon;
revoke all on function public.create_couple_space(text) from public, anon;
revoke all on function public.create_space_invitation() from public, anon;
revoke all on function public.revoke_space_invitations() from public, anon;
revoke all on function public.accept_space_invitation(uuid) from public, anon;
grant usage on schema private to authenticated;
grant execute on function private.is_space_member(uuid) to authenticated;
grant execute on function private.create_couple_space(text) to authenticated;
grant execute on function private.create_space_invitation() to authenticated;
grant execute on function private.revoke_space_invitations() to authenticated;
grant execute on function private.accept_space_invitation(uuid) to authenticated;
grant execute on function public.create_couple_space(text) to authenticated;
grant execute on function public.create_space_invitation() to authenticated;
grant execute on function public.revoke_space_invitations() to authenticated;
grant execute on function public.accept_space_invitation(uuid) to authenticated;
grant select on public.couple_spaces, public.space_members to authenticated;
grant select, insert, update, delete on public.wishes to authenticated;
grant select, insert, update, delete on public.checkins to authenticated;
