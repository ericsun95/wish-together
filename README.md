# Wish Together

A shared wishlist for two people. Save links (including Xiaohongshu), make plans, and check off the things you do together.

## Project status

The app uses Next.js and TypeScript. It supports Chinese and English UI, URL-based wishes, and a simple completed view. Wishes are currently stored only in this browser. Supabase email sign-in and private couple spaces are available when configured, but shared wish storage is still in progress.

## Run locally

Install dependencies with `pnpm install`, then start the app with `pnpm dev`. Open `http://localhost:3000`.

See [PLAN.md](PLAN.md) and the repository's GitHub Issues for the MVP roadmap.

## Configure shared spaces

1. Create a Supabase project and run the SQL in `supabase/migrations/202609200001_couple_spaces.sql` in its SQL editor.
2. Copy `.env.example` to `.env.local`. Fill in the project URL and publishable key from Connect > Framework. Never put a secret or service role key in a `NEXT_PUBLIC_` variable.
3. In Supabase Authentication URL Configuration, allow the local app URL (`http://localhost:3000` or the URL you use) as a redirect URL. For production, add the deployed URL too.
4. Restart the app. Use two distinct email accounts to test creating a space, generating an invite, accepting it, and signing out.

Run `pnpm test:db` to check invitation behavior and row-level security in an in-memory PostgreSQL database. This test does not send email or replace a test against the hosted Supabase project.
