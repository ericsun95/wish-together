create or replace function private.create_space_invitation()
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

  select token into v_token
  from public.space_invitations
  where space_id = v_space
    and accepted_at is null
    and revoked_at is null
    and expires_at > now()
  order by created_at desc
  limit 1;

  if v_token is not null then return v_token; end if;

  insert into public.space_invitations (space_id, created_by)
  values (v_space, v_user) returning token into v_token;
  return v_token;
end;
$$;
