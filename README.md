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
