-- Versions include checklist changes. Existing member RLS remains authoritative.
alter table public.wishes add column version bigint not null default 1,
  add column updated_at timestamptz not null default now(),
  add column updated_by uuid, add column last_mutation uuid;
create function private.version_wish() returns trigger language plpgsql security invoker set search_path='' as $$
begin
  new.version := old.version + 1; new.updated_at := clock_timestamp(); new.updated_by := auth.uid();
  -- A direct/legacy edit invalidates the previous retry token.
  if new.last_mutation is not distinct from old.last_mutation then new.last_mutation := null; end if;
  return new;
end $$;
create trigger version_wish before update on public.wishes for each row execute function private.version_wish();
create function private.version_checklist_wish() returns trigger language plpgsql security invoker set search_path='' as $$
begin
  if TG_OP <> 'INSERT' then update public.wishes set updated_at=now() where id=old.wish_id; end if;
  if TG_OP='INSERT' or (TG_OP='UPDATE' and new.wish_id<>old.wish_id) then
    update public.wishes set updated_at=now() where id=new.wish_id;
  end if;
  return null;
end $$;
create trigger version_checklist_wish after insert or update or delete on public.wish_checklist_items for each row execute function private.version_checklist_wish();

create function public.save_wish(p_id uuid,p_space uuid,p_expected bigint,p_mutation uuid,p_payload jsonb,p_items jsonb)
returns bigint language plpgsql security invoker set search_path='' as $$
declare existing public.wishes; result bigint;
begin
  if auth.uid() is null or not private.is_space_member(p_space) then raise exception 'Not a space member'; end if;
  if p_mutation is null or jsonb_typeof(p_items)<>'array' or jsonb_array_length(p_items)>100 then raise exception 'Invalid payload'; end if;
  -- Serialize duplicate creates as well as edits, without relying on a client retry timer.
  perform 1 from public.couple_spaces where id=p_space for update;
  select * into existing from public.wishes where id=p_id and space_id=p_space for update;
  if found then
    if existing.last_mutation=p_mutation then return existing.version; end if;
    if p_expected is null or existing.version<>p_expected then raise exception 'wish_conflict'; end if;
  elsif p_expected is not null then raise exception 'wish_conflict';
  else
    insert into public.wishes(id,space_id,created_by,title) values(p_id,p_space,auth.uid(),p_payload->>'title');
  end if;
  update public.wishes set title=p_payload->>'title', note=coalesce(p_payload->>'note',''),
    url=nullif(p_payload->>'url',''), address=coalesce(p_payload->>'address',''), category=coalesce(p_payload->>'category',''),
    status=p_payload->>'status', planned_date=nullif(p_payload->>'plannedDate','')::date,
    completed_note=coalesce(p_payload->>'completionNote',''),
    completed_at=case when p_payload->>'status'='done' then coalesce(completed_at,now()) else null end,
    latitude=(p_payload->'location'->>'latitude')::double precision,
    longitude=(p_payload->'location'->>'longitude')::double precision,
    deleted_at=(p_payload->>'deletedAt')::timestamptz
    where id=p_id and space_id=p_space;
  delete from public.wish_checklist_items where wish_id=p_id;
  insert into public.wish_checklist_items(id,wish_id,space_id,label,completed,position)
    select (item->>'id')::uuid,p_id,p_space,item->>'label',coalesce((item->>'completed')::boolean,false),ordinality-1
    from jsonb_array_elements(p_items) with ordinality as entries(item,ordinality);
  update public.wishes set last_mutation=p_mutation where id=p_id returning version into result;
  return result;
end $$;
revoke all on function public.save_wish(uuid,uuid,bigint,uuid,jsonb,jsonb) from public,anon;
grant execute on function public.save_wish(uuid,uuid,bigint,uuid,jsonb,jsonb) to authenticated;
revoke all on function private.version_wish(), private.version_checklist_wish() from public,anon,authenticated;
