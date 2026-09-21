# Wish Together: MVP Plan

## Product goal

A private shared wishlist for two people. Save inspiration links, decide what to do together, and keep a small record when a wish is completed.

## MVP decisions

- Build a mobile-first web app with Next.js and TypeScript.
- Support Simplified Chinese (`zh-CN`) and English (`en`) from the first release. Both partners can choose their own language; the choice persists across sessions. The switch translates app-owned UI text, not wish titles or notes written by users.
- Let one partner invite the other into a private shared space.
- Start a new wish with a title. A source URL, place/address, note, category, and checklist are optional. Xiaohongshu links are stored and opened as links when provided.
- Use three wish states: Want to do, Planned, and Done. Planned wishes can have an optional target date.
- A completed wish can have a completion date and short note.
- Keep the interface focused on the shared list and completed memories. Reminders, public sharing, and link scraping are outside the MVP. Native share-sheet intake and check-in photos follow after the core flow works.

## GitHub Issue backlog

Create one issue for each item below, in order. Keep issue titles, descriptions, and acceptance criteria in English.

### 1. Set up the app and bilingual UI foundation

**Scope:** Initialize Next.js, TypeScript, styling, and a simple mobile-first shell. Add `zh-CN` and `en` message catalogs and a language switcher.

**Acceptance criteria:** All app-owned UI text comes from translation catalogs; the chosen language persists after refresh; language selection does not change the other partner's preference; user-written titles and notes remain unchanged; missing translations are detectable during development.

### 2. Add sign-in and private couple spaces

**Scope:** Add authentication, create a space, and invite one partner through a shareable invitation. Choose the sign-in method before implementation; start with email links unless a better fit emerges.

**Acceptance criteria:** A space has at most two members; only members can read or change its wishes and check-ins; an invitation cannot be reused after it is accepted or revoked.

### 3. Create and organize wishes

**Scope:** Add, edit, delete, and list wishes with a required title plus optional note, category, source URL, place/address, and checklist. Show who added each wish.

**Acceptance criteria:** A wish can be saved without a URL; a provided Xiaohongshu or other source URL is retained and opens correctly; malformed non-empty URLs are rejected with a localized message; a wish can store an optional place/address; members can add, remove, and check checklist items; both members see the same list; empty, loading, and error states work in both languages.

### 4. Plan and complete wishes

**Scope:** Move wishes between Want to do, Planned, and Done. Add an optional target date for Planned wishes and a completion date and note for Done wishes.

**Acceptance criteria:** Members can set or clear a planned date, mark a wish done, and see it in a completed view; a completed wish retains its source link; users can correct a mistaken status or check-in.

### 5. Polish the shared workflow

**Scope:** Add filtering by status/category, responsive layouts, and accessible form and navigation behavior.

**Acceptance criteria:** The core flow works on common phone widths and desktop; keyboard navigation and labels work; translated text fits without clipping; one partner's updates appear for the other after refresh.

### 6. Verify and release the MVP

**Scope:** Test the two-member journey, both locales, permissions, and deployment configuration.

**Acceptance criteria:** A fresh user can create a space, invite a partner, save a wish with or without a source link, plan it, and check it off; unauthorized access is denied; the deployed app has a documented setup path.

## Open product decisions

- Decide whether a space can be reset after a partner leaves (defer until after MVP).

## After MVP

- Accept a link directly from a device share sheet when the platform supports it.
- Allow optional check-in photos, visible only to space members.
- Consider reminders after observing how the shared list is used.
