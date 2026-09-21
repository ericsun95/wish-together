alter table public.couple_spaces
add column theme text not null default 'clean'
check (theme in ('clean', 'coast', 'city', 'garden'));

create policy "members update their space" on public.couple_spaces
for update to authenticated using (private.is_space_member(id))
with check (private.is_space_member(id));

grant update (theme) on public.couple_spaces to authenticated;
