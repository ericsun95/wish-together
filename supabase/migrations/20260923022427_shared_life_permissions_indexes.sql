-- Hosted Supabase can grant table-wide privileges by default. Reset those
-- before applying column-level permissions; RLS remains enabled throughout.
revoke all on public.space_members, public.couple_spaces, public.anniversaries,
  public.wish_plans, public.memories, public.discussion_comments, public.comment_reactions
from public, anon, authenticated;
grant select on public.space_members, public.couple_spaces to authenticated;
grant update(display_name, avatar_url, custom_avatar, profile_customized) on public.space_members to authenticated;
grant update(name, signature, together_since, theme, background_photo) on public.couple_spaces to authenticated;
grant select, insert, delete on public.anniversaries, public.wish_plans, public.memories,
  public.discussion_comments, public.comment_reactions to authenticated;
grant update(title, event_date, repeats_yearly, emoji, note) on public.anniversaries to authenticated;
grant update(date_on, budget, currency, owner_task, partner_task) on public.wish_plans to authenticated;
grant update(caption, taken_on, photo_ready) on public.memories to authenticated;

create index discussion_wish_fk_idx on public.discussion_comments(wish_id, space_id);
create index discussion_anniversary_fk_idx on public.discussion_comments(anniversary_id, space_id);
create index discussion_memory_fk_idx on public.discussion_comments(memory_id, space_id);
create index wish_plans_wish_space_idx on public.wish_plans(wish_id, space_id);
