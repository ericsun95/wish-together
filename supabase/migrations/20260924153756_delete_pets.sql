-- Both members may remove a pet from their shared space.
-- The existing pet_care(pet_id,space_id) FK cascades only that pet's journal.
grant delete on public.space_pets to authenticated;
create policy "members delete pet" on public.space_pets
for delete to authenticated using (private.is_space_member(space_id));
