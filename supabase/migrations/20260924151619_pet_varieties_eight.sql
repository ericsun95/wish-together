-- Keep existing cats and dogs on their original appearance and preserve all care records.
alter table public.space_pets add column appearance text not null default 'classic';
alter table public.space_pets drop constraint space_pets_slot_check;
alter table public.space_pets add constraint space_pets_slot_check check(slot between 1 and 8);
alter table public.space_pets drop constraint space_pets_species_check;
alter table public.space_pets add constraint space_pets_species_check check(species in ('cat','dog','rabbit','hamster'));
alter table public.space_pets add constraint space_pets_appearance_check check (
  (species='cat' and appearance in ('classic','silver')) or
  (species='dog' and appearance in ('classic','pom')) or
  (species='rabbit' and appearance='lop') or
  (species='hamster' and appearance='golden')
);
grant insert(appearance) on public.space_pets to authenticated;
-- Retain the membership checks, per-space lock, and server-assigned slots.
create or replace function private.assign_pet_slot() returns trigger
language plpgsql security definer set search_path='' as $$
begin
  if auth.uid() is null or not private.is_space_member(new.space_id) or new.created_by<>auth.uid() then raise exception 'Not a space member'; end if;
  perform 1 from public.couple_spaces where id=new.space_id for update;
  select s into new.slot from generate_series(1,8) s where not exists(select 1 from public.space_pets p where p.space_id=new.space_id and p.slot=s) order by s limit 1;
  if new.slot is null then raise exception 'Your pet family is full (8 pets)'; end if;
  return new;
end $$;
revoke all on function private.assign_pet_slot() from public,anon,authenticated;
