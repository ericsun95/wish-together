import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";

const db = new PGlite();
const owner = "11111111-1111-4111-8111-111111111111";
const partner = "22222222-2222-4222-8222-222222222222";
const outsider = "33333333-3333-4333-8333-333333333333";

async function as(userId) {
  await db.exec(`set role authenticated; set request.jwt.claim.sub = '${userId}';`);
}

async function rejects(query, params) {
  await assert.rejects(db.query(query, params));
}

try {
  await db.exec(`
    create role authenticated;
    create role anon;
    create schema auth;
    create table auth.users (id uuid primary key);
    create function auth.uid() returns uuid language sql stable
      as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
    insert into auth.users (id) values ('${owner}'), ('${partner}'), ('${outsider}');
  `);
  const migration = await readFile(new URL("../supabase/migrations/202609200001_couple_spaces.sql", import.meta.url), "utf8");
  await db.exec(migration);

  await as(owner);
  const created = await db.query("select public.create_couple_space($1) as id", ["Our list"]);
  const spaceId = created.rows[0].id;
  const invited = await db.query("select public.create_space_invitation() as token");
  const revokedToken = invited.rows[0].token;
  await db.query("select public.revoke_space_invitations()");
  assert.equal((await db.query("select count(*)::int as count from public.couple_spaces")).rows[0].count, 1);

  await as(outsider);
  assert.equal((await db.query("select count(*)::int as count from public.couple_spaces")).rows[0].count, 0);
  await rejects("select public.create_space_invitation()");

  await as(partner);
  await rejects("select public.accept_space_invitation($1)", [revokedToken]);

  await as(owner);
  const activeInvite = await db.query("select public.create_space_invitation() as token");
  const token = activeInvite.rows[0].token;

  await as(partner);
  const joined = await db.query("select public.accept_space_invitation($1) as id", [token]);
  assert.equal(joined.rows[0].id, spaceId);
  await rejects("select public.accept_space_invitation($1)", [token]);
  assert.equal((await db.query("select count(*)::int as count from public.space_members")).rows[0].count, 2);

  await as(owner);
  await rejects("select public.create_space_invitation()");
  const savedWish = await db.query("insert into public.wishes (space_id, created_by, title, url) values ($1, $2, $3, $4) returning id", [spaceId, owner, "Cafe", "https://example.com"]);
  const wishId = savedWish.rows[0].id;
  await db.query("insert into public.checkins (space_id, wish_id, created_by, note) values ($1, $2, $3, $4)", [spaceId, wishId, owner, "Great day"]);

  await as(partner);
  assert.equal((await db.query("select count(*)::int as count from public.wishes")).rows[0].count, 1);
  assert.equal((await db.query("select count(*)::int as count from public.checkins")).rows[0].count, 1);

  await as(outsider);
  assert.equal((await db.query("select count(*)::int as count from public.wishes")).rows[0].count, 0);
  assert.equal((await db.query("select count(*)::int as count from public.checkins")).rows[0].count, 0);
  await rejects("select public.accept_space_invitation($1)", [token]);
  await rejects("insert into public.wishes (space_id, created_by, title, url) values ($1, $2, $3, $4)", [spaceId, outsider, "No", "https://example.com"]);
  await rejects("insert into public.checkins (space_id, wish_id, created_by) values ($1, $2, $3)", [spaceId, wishId, outsider]);

  await db.exec("reset role");
  console.log("Database permissions and invitation flow passed.");
} finally {
  await db.close();
}
