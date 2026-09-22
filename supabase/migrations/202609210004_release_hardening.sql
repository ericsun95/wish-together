do $$
begin
  if to_regprocedure('public.rls_auto_enable()') is not null then
    revoke all on function public.rls_auto_enable() from public, anon, authenticated;
  end if;
end $$;

create index if not exists couple_spaces_owner_id_idx on public.couple_spaces (owner_id);
create index if not exists wishes_created_by_idx on public.wishes (created_by);
create index if not exists checkins_created_by_idx on public.checkins (created_by);
create index if not exists checkins_wish_space_idx on public.checkins (wish_id, space_id);
create index if not exists space_invitations_space_id_idx on public.space_invitations (space_id);
create index if not exists space_invitations_created_by_idx on public.space_invitations (created_by);
create index if not exists wish_checklist_items_wish_space_idx on public.wish_checklist_items (wish_id, space_id);
