# Wish Together

A bilingual private wishlist for two people. Save ideas and links, add places and checklists, personalize the shared space, and check off experiences together.

## Run locally

Install dependencies with `pnpm install`, then start the app with `pnpm dev`. Open `http://localhost:3000`.

Copy `.env.example` to `.env.local` and add the Supabase project URL and publishable key. Never add a secret or service-role key to a `NEXT_PUBLIC_` variable.

## Supabase setup

Apply the SQL files in `supabase/migrations` in filename order. Configure Google as an authentication provider, then add local and production app URLs to Authentication > URL Configuration > Redirect URLs.

Run `pnpm test:db` to verify the invitation model and row-level security in an in-memory PostgreSQL database.

## GitHub Pages deployment

The `Deploy to GitHub Pages` workflow builds and publishes `main` automatically.

1. In repository Settings > Secrets and variables > Actions, add `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` as repository secrets.
2. In Settings > Pages, select GitHub Actions as the source.
3. Add `https://ericsun95.github.io/wish-together/` to the Supabase redirect allowlist.

The production app is available at `https://ericsun95.github.io/wish-together/` after a successful workflow run.

See [PLAN.md](PLAN.md) and the repository's GitHub Issues for the roadmap.

## Shared-life features

The **Our life** tab contains multiple anniversaries and a private memory album. Wish cards open comments and date plans; completing a wish opens its memories. Profiles include personal nicknames and avatars plus the shared motto and relationship start date.

Apply `202609220003_shared_life.sql` and `20260923022427_shared_life_permissions_indexes.sql` before deploying these screens. It adds member-only tables and the private `couple-memories` Storage bucket. No service-role key is used in the browser.

- Photos are re-encoded to JPEG locally (up to 1440 px / 500 KB); original files and metadata are not uploaded. Thumbnails are at most 24 KB. Each space is limited to 200 memory records, including incomplete uploads.
- Metadata reserves the permitted Storage paths before upload. Failures attempt cleanup; incomplete entries can be removed from the album. Deletion removes both image objects before removing the record.
- The album loads 12 metadata records per page and uses short-lived signed URLs. Full photos load only when opened. A saved background is an independent copy, so removing an album photo does not remove the current background.
- Anniversary countdowns use calendar dates in the viewer's timezone; February 29 recurs on February 28 in non-leap years. These are in-app countdowns, not push notifications.

Run `pnpm test:life` for date and random-selection edge cases. `pnpm test:db` checks table and Storage policy isolation with a minimal in-memory Storage schema; real upload/download behavior also requires the connected Supabase project.
