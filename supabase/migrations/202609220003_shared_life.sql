alter table public.couple_spaces
  add column signature text not null default '' check (char_length(signature) <= 160),
  add column together_since date;
grant update (name, signature, together_since) on public.couple_spaces to authenticated;
alter table public.space_members
  add column custom_avatar text check (custom_avatar is null or (octet_length(custom_avatar) <= 100000 and custom_avatar ~ '^data:image/jpeg;base64,[A-Za-z0-9+/=]+$')),
  add column profile_customized boolean not null default false;
grant update (custom_avatar, profile_customized) on public.space_members to authenticated;

create table public.anniversaries (
  id uuid primary key default gen_random_uuid(),
  space_id uuid not null references public.couple_spaces(id) on delete cascade,
  created_by uuid not null references auth.users(id),
  title text not null check (char_length(trim(title)) between 1 and 80),
  event_date date not null,
  repeats_yearly boolean not null default true,
  emoji text not null default '💕' check (emoji in ('💕','🎂','💍','✈️','🎉','🌷')),
  note text not null default '' check (char_length(note) <= 1000),
  created_at timestamptz not null default now(),
  unique(id, space_id)
);
create index anniversaries_space_date on public.anniversaries(space_id, event_date);

create table public.wish_plans (
  wish_id uuid primary key,
  space_id uuid not null references public.couple_spaces(id) on delete cascade,
  date_on date,
  budget numeric(12,2) check (budget is null or budget >= 0),
  currency text not null default 'USD' check (currency in ('USD','CNY','EUR','GBP','JPY','CAD','AUD')),
  owner_task text not null default '' check (char_length(owner_task) <= 500),
  partner_task text not null default '' check (char_length(partner_task) <= 500),
  foreign key (wish_id, space_id) references public.wishes(id, space_id) on delete cascade
);
create index wish_plans_space_date on public.wish_plans(space_id, date_on);

create table public.memories (
  id uuid primary key default gen_random_uuid(),
  space_id uuid not null references public.couple_spaces(id) on delete cascade,
  created_by uuid not null references auth.users(id),
  wish_id uuid,
  caption text not null default '' check (char_length(caption) <= 1000),
  taken_on date not null default current_date,
  photo_ready boolean not null default false,
  byte_size integer not null check (byte_size between 1 and 524000),
  created_at timestamptz not null default now(),
  unique(id, space_id),
  foreign key (wish_id, space_id) references public.wishes(id, space_id) on delete set null (wish_id)
);
create index memories_space_created on public.memories(space_id, taken_on desc, created_at desc);
create function private.limit_space_memories() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null or not private.is_space_member(new.space_id) then
    raise exception 'Space membership required';
  end if;
  perform 1 from public.couple_spaces where id = new.space_id for update;
  if (select count(*) from public.memories where space_id = new.space_id) >= 200 then
    raise exception 'Album limit reached: remove a photo before adding another';
  end if;
  return new;
end;
$$;
revoke all on function private.limit_space_memories() from public, anon, authenticated;
create trigger limit_space_memories before insert on public.memories for each row execute function private.limit_space_memories();

create table public.discussion_comments (
  id uuid primary key default gen_random_uuid(),
  space_id uuid not null references public.couple_spaces(id) on delete cascade,
  created_by uuid not null references auth.users(id),
  wish_id uuid,
  anniversary_id uuid,
  memory_id uuid,
  body text not null check (char_length(trim(body)) between 1 and 2000),
  created_at timestamptz not null default now(),
  unique(id, space_id),
  check (num_nonnulls(wish_id, anniversary_id, memory_id) = 1),
  foreign key (wish_id, space_id) references public.wishes(id, space_id) on delete cascade,
  foreign key (anniversary_id, space_id) references public.anniversaries(id, space_id) on delete cascade,
  foreign key (memory_id, space_id) references public.memories(id, space_id) on delete cascade
);
create index discussion_wish on public.discussion_comments(space_id, wish_id, created_at);
create index discussion_anniversary on public.discussion_comments(space_id, anniversary_id, created_at);
create index discussion_memory on public.discussion_comments(space_id, memory_id, created_at);
create table public.comment_reactions (
  comment_id uuid not null,
  space_id uuid not null references public.couple_spaces(id) on delete cascade,
  user_id uuid not null references auth.users(id),
  emoji text not null check (emoji in ('❤️','🥰','😂','👍','🎉','👀')),
  primary key(comment_id, user_id, emoji),
  foreign key (comment_id, space_id) references public.discussion_comments(id, space_id) on delete cascade
);

-- Each new feature is isolated to the existing two-member space.
do $$ declare t text; begin
  foreach t in array array['anniversaries','wish_plans','memories','discussion_comments','comment_reactions'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('create policy "members read" on public.%I for select to authenticated using (private.is_space_member(space_id))', t);
    execute format('grant select, insert, delete on public.%I to authenticated', t);
  end loop;
  foreach t in array array['anniversaries','memories','discussion_comments'] loop
    execute format('create policy "members create" on public.%I for insert to authenticated with check (private.is_space_member(space_id) and created_by = (select auth.uid()))', t);
  end loop;
  foreach t in array array['anniversaries','wish_plans','memories'] loop
    execute format('create policy "members edit" on public.%I for update to authenticated using (private.is_space_member(space_id)) with check (private.is_space_member(space_id))', t);
    execute format('create policy "members remove" on public.%I for delete to authenticated using (private.is_space_member(space_id))', t);
  end loop;
end $$;
grant update(title, event_date, repeats_yearly, emoji, note) on public.anniversaries to authenticated;
grant update(date_on, budget, currency, owner_task, partner_task) on public.wish_plans to authenticated;
grant update(caption, taken_on, photo_ready) on public.memories to authenticated;
create policy "members create plan" on public.wish_plans for insert to authenticated with check (private.is_space_member(space_id));
create policy "author removes comment" on public.discussion_comments for delete to authenticated using (private.is_space_member(space_id) and created_by = (select auth.uid()));
create policy "own reaction insert" on public.comment_reactions for insert to authenticated with check (private.is_space_member(space_id) and user_id = (select auth.uid()));
create policy "own reaction delete" on public.comment_reactions for delete to authenticated using (private.is_space_member(space_id) and user_id = (select auth.uid()));

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('couple-memories', 'couple-memories', false, 500000, array['image/jpeg'])
on conflict (id) do nothing;
-- Paths are reserved metadata ids: space-id/memory-id/photo.jpg or thumb.jpg.
create policy "members read memory photos" on storage.objects for select to authenticated using (
  bucket_id = 'couple-memories' and exists (
    select 1 from public.memories m where name in (m.space_id::text || '/' || m.id::text || '/photo.jpg', m.space_id::text || '/' || m.id::text || '/thumb.jpg')
    and private.is_space_member(m.space_id)
  )
);
create policy "author uploads reserved photo" on storage.objects for insert to authenticated with check (
  bucket_id = 'couple-memories' and exists (
    select 1 from public.memories m where name in (m.space_id::text || '/' || m.id::text || '/photo.jpg', m.space_id::text || '/' || m.id::text || '/thumb.jpg')
    and m.created_by = (select auth.uid()) and not m.photo_ready and private.is_space_member(m.space_id)
  )
);
create policy "members remove memory photos" on storage.objects for delete to authenticated using (
  bucket_id = 'couple-memories' and exists (
    select 1 from public.memories m where name in (m.space_id::text || '/' || m.id::text || '/photo.jpg', m.space_id::text || '/' || m.id::text || '/thumb.jpg')
    and private.is_space_member(m.space_id)
  )
);

create index anniversaries_created_by_idx on public.anniversaries(created_by);
create index memories_created_by_idx on public.memories(created_by);
create index memories_wish_space_idx on public.memories(wish_id, space_id);
create index discussion_created_by_idx on public.discussion_comments(created_by);
create index reactions_space_idx on public.comment_reactions(space_id);
create index reactions_user_idx on public.comment_reactions(user_id);
create index reactions_comment_space_idx on public.comment_reactions(comment_id, space_id);
