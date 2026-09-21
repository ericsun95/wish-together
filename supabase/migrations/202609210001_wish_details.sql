alter table public.wishes alter column url drop not null;
alter table public.wishes alter column url drop default;
alter table public.wishes add column address text not null default '';
alter table public.wishes add column category text not null default '';

create table public.wish_checklist_items (
  id uuid primary key default gen_random_uuid(),
  wish_id uuid not null,
  space_id uuid not null,
  label text not null check (char_length(trim(label)) between 1 and 200),
  completed boolean not null default false,
  position integer not null default 0,
  created_at timestamptz not null default now(),
  foreign key (wish_id, space_id) references public.wishes(id, space_id) on delete cascade
);

create index checklist_by_wish on public.wish_checklist_items (wish_id, position, created_at);

alter table public.wish_checklist_items enable row level security;

create policy "members read checklist items" on public.wish_checklist_items
for select to authenticated using (private.is_space_member(space_id));

create policy "members add checklist items" on public.wish_checklist_items
for insert to authenticated with check (private.is_space_member(space_id));

create policy "members update checklist items" on public.wish_checklist_items
for update to authenticated using (private.is_space_member(space_id))
with check (private.is_space_member(space_id));

create policy "members delete checklist items" on public.wish_checklist_items
for delete to authenticated using (private.is_space_member(space_id));

grant select, insert, update, delete on public.wish_checklist_items to authenticated;
