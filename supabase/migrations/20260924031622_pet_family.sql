-- Preserve the original pet and attach its existing journal before allowing siblings.
alter table public.space_pets add column id uuid not null default gen_random_uuid();
alter table public.space_pets add column slot smallint not null default 1 check(slot between 1 and 4);
alter table public.pet_care add column pet_id uuid;
update public.pet_care c set pet_id=p.id from public.space_pets p where p.space_id=c.space_id;
alter table public.pet_care alter column pet_id set not null;
alter table public.pet_care drop constraint pet_care_space_id_fkey;
alter table public.pet_care drop constraint pet_care_space_id_user_id_action_care_day_key;
alter table public.space_pets drop constraint space_pets_pkey;
alter table public.space_pets add primary key(id);
alter table public.space_pets add unique(space_id,slot);
alter table public.space_pets add unique(id,space_id);
alter table public.pet_care add foreign key(pet_id,space_id) references public.space_pets(id,space_id) on delete cascade;
alter table public.pet_care add unique(pet_id,user_id,action,care_day);
create index pet_care_pet_journal on public.pet_care(pet_id,space_id,created_at desc);

-- Serialize adoptions per space; column privileges prevent clients choosing their own slot.
create function private.assign_pet_slot() returns trigger
language plpgsql security definer set search_path='' as $$
begin
  if auth.uid() is null or not private.is_space_member(new.space_id) or new.created_by<>auth.uid() then raise exception 'Not a space member'; end if;
  perform 1 from public.couple_spaces where id=new.space_id for update;
  select s into new.slot from generate_series(1,4) s where not exists(select 1 from public.space_pets p where p.space_id=new.space_id and p.slot=s) order by s limit 1;
  if new.slot is null then raise exception 'Your pet family is full (4 pets)'; end if;
  return new;
end $$;
revoke all on function private.assign_pet_slot() from public,anon,authenticated;
create trigger assign_pet_slot before insert on public.space_pets for each row execute function private.assign_pet_slot();

create function private.care_for_named_pet(p_space uuid,p_pet uuid,p_action text) returns boolean
language plpgsql security definer set search_path='' as $$
declare inserted_count integer;
begin
  if auth.uid() is null or not private.is_space_member(p_space) then raise exception 'Not a space member'; end if;
  if p_action is null or p_action not in ('feed','play','cuddle') then raise exception 'Invalid action'; end if;
  perform 1 from public.space_pets where space_id=p_space and id=p_pet for update;
  if not found then raise exception 'Pet not found in this space'; end if;
  insert into public.pet_care(space_id,pet_id,user_id,action) values(p_space,p_pet,auth.uid(),p_action) on conflict(pet_id,user_id,action,care_day) do nothing;
  get diagnostics inserted_count=row_count;
  if inserted_count=1 then update public.space_pets set experience=experience+10 where id=p_pet; end if;
  return inserted_count=1;
end $$;
revoke all on function private.care_for_named_pet(uuid,uuid,text) from public,anon;
grant execute on function private.care_for_named_pet(uuid,uuid,text) to authenticated;
create function public.care_for_named_pet(p_space uuid,p_pet uuid,p_action text) returns boolean
language sql security invoker set search_path='' as $$ select private.care_for_named_pet(p_space,p_pet,p_action); $$;
revoke all on function public.care_for_named_pet(uuid,uuid,text) from public,anon;
grant execute on function public.care_for_named_pet(uuid,uuid,text) to authenticated;

-- An already-open older client may still care for the original pet.
create or replace function private.care_for_pet(p_space uuid,p_action text) returns boolean
language plpgsql security definer set search_path='' as $$
declare original_pet uuid;
begin
  if auth.uid() is null or not private.is_space_member(p_space) then raise exception 'Not a space member'; end if;
  select id into original_pet from public.space_pets where space_id=p_space order by slot limit 1;
  return private.care_for_named_pet(p_space,original_pet,p_action);
end $$;
