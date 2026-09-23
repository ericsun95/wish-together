create table public.space_pets (
  space_id uuid primary key references public.couple_spaces(id) on delete cascade,
  name text not null check (char_length(trim(name)) between 1 and 24),
  species text not null check (species in ('cat','dog')),
  experience integer not null default 0 check (experience >= 0),
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now()
);
create table public.pet_care (
  id uuid primary key default gen_random_uuid(),
  space_id uuid not null references public.space_pets(space_id) on delete cascade,
  user_id uuid not null references auth.users(id),
  action text not null check (action in ('feed','play','cuddle')),
  care_day date not null default ((now() at time zone 'UTC')::date),
  created_at timestamptz not null default now(),
  unique(space_id,user_id,action,care_day)
);
create index pet_care_journal on public.pet_care(space_id,created_at desc);
create index pet_care_user on public.pet_care(user_id);
create index space_pets_creator on public.space_pets(created_by);
alter table public.space_pets enable row level security;
alter table public.pet_care enable row level security;
revoke all on public.space_pets, public.pet_care from public, anon, authenticated;
grant select on public.space_pets, public.pet_care to authenticated;
grant insert(space_id,name,species,created_by), update(name) on public.space_pets to authenticated;
create policy "members see pet" on public.space_pets for select to authenticated using(private.is_space_member(space_id));
create policy "members adopt pet" on public.space_pets for insert to authenticated with check(private.is_space_member(space_id) and created_by=(select auth.uid()));
create policy "members name pet" on public.space_pets for update to authenticated using(private.is_space_member(space_id)) with check(private.is_space_member(space_id));
create policy "members read pet journal" on public.pet_care for select to authenticated using(private.is_space_member(space_id));

create function private.care_for_pet(p_space uuid,p_action text) returns boolean
language plpgsql security definer set search_path='' as $$
declare inserted_count integer;
begin
  if auth.uid() is null or not private.is_space_member(p_space) then raise exception 'Not a space member'; end if;
  if p_action is null or p_action not in ('feed','play','cuddle') then raise exception 'Invalid action'; end if;
  perform 1 from public.space_pets where space_id=p_space for update;
  if not found then raise exception 'Adopt a pet first'; end if;
  insert into public.pet_care(space_id,user_id,action) values(p_space,auth.uid(),p_action) on conflict(space_id,user_id,action,care_day) do nothing;
  get diagnostics inserted_count=row_count;
  if inserted_count=1 then update public.space_pets set experience=experience+10 where space_id=p_space; end if;
  return inserted_count=1;
end $$;
revoke all on function private.care_for_pet(uuid,text) from public,anon;
grant execute on function private.care_for_pet(uuid,text) to authenticated;
create function public.care_for_pet(p_space uuid,p_action text) returns boolean
language sql security invoker set search_path='' as $$ select private.care_for_pet(p_space,p_action); $$;
revoke all on function public.care_for_pet(uuid,text) from public,anon;
grant execute on function public.care_for_pet(uuid,text) to authenticated;
