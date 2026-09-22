-- Only the two space members can read these profiles and the shared photo.
alter table public.space_members
  add column display_name text not null default '' check (char_length(display_name) <= 80),
  add column avatar_url text not null default '' check (char_length(avatar_url) <= 2048 and (avatar_url = '' or avatar_url ~ '^https://'));

update public.space_members m set
  display_name = left(coalesce(u.raw_user_meta_data->>'full_name', u.raw_user_meta_data->>'name', ''), 80),
  avatar_url = case when coalesce(u.raw_user_meta_data->>'avatar_url', u.raw_user_meta_data->>'picture', '') ~ '^https://'
    then left(coalesce(u.raw_user_meta_data->>'avatar_url', u.raw_user_meta_data->>'picture'), 2048) else '' end
from auth.users u where u.id = m.user_id;

create policy "members update their own profile" on public.space_members
for update to authenticated using (user_id = (select auth.uid()))
with check (user_id = (select auth.uid()));
grant update (display_name, avatar_url) on public.space_members to authenticated;

-- One compressed JPEG per space, read through the existing member-only RLS.
alter table public.couple_spaces add column background_photo text
check (background_photo is null or (
  octet_length(background_photo) <= 1500000 and
  background_photo ~ '^data:image/jpeg;base64,[A-Za-z0-9+/=]+$'
));
grant update (background_photo) on public.couple_spaces to authenticated;

alter table public.couple_spaces add column appearance_updated_at timestamptz not null default now();
create function private.touch_space_appearance() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.appearance_updated_at := clock_timestamp();
  return new;
end;
$$;
create trigger touch_space_appearance before update of theme, background_photo on public.couple_spaces
for each row execute function private.touch_space_appearance();
