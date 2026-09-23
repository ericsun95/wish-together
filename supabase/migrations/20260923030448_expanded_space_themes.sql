alter table public.couple_spaces drop constraint couple_spaces_theme_check;
alter table public.couple_spaces add constraint couple_spaces_theme_check
  check (theme in ('clean', 'coast', 'city', 'garden', 'blush', 'lavender', 'peach', 'midnight'));
