import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
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
    alter default privileges in schema public grant all on tables to anon, authenticated;
    create schema auth;
    create schema storage;
    create table storage.buckets (id text primary key, name text, public boolean, file_size_limit bigint, allowed_mime_types text[]);
    create table storage.objects (id uuid primary key default gen_random_uuid(), bucket_id text references storage.buckets(id), name text not null, unique(bucket_id,name));
    alter table storage.objects enable row level security;
    grant usage on schema storage to authenticated, anon;
    grant select, insert, update, delete on storage.objects to authenticated;

    create table auth.users (id uuid primary key, raw_user_meta_data jsonb default '{}'::jsonb);
    create function auth.uid() returns uuid language sql stable
      as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
    insert into auth.users (id) values ('${owner}'), ('${partner}'), ('${outsider}');
  `);
  const migrationsUrl = new URL("../supabase/migrations/", import.meta.url);
  const migrations = (await readdir(migrationsUrl)).filter((name) => name.endsWith(".sql")).sort();
  for (const migration of migrations.filter(name=>!name.endsWith('_pet_family.sql'))) {
    await db.exec(await readFile(new URL(migration, migrationsUrl), "utf8"));
  }

  assert.equal((await db.query("select has_column_privilege('authenticated','public.space_members','role','UPDATE') as allowed")).rows[0].allowed, false);
  assert.equal((await db.query("select has_column_privilege('authenticated','public.memories','created_by','UPDATE') as allowed")).rows[0].allowed, false);
  assert.equal((await db.query("select has_table_privilege('anon','public.memories','SELECT') as allowed")).rows[0].allowed, false);
  await as(owner);
  const created = await db.query("select public.create_couple_space($1) as id", ["Our list"]);
  const spaceId = created.rows[0].id;
  const invited = await db.query("select public.create_space_invitation() as token");
  const revokedToken = invited.rows[0].token;
  const repeatedInvite = await db.query("select public.create_space_invitation() as token");
  assert.equal(repeatedInvite.rows[0].token, revokedToken);
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
  const savedWish = await db.query("insert into public.wishes (space_id, created_by, title, url, address) values ($1, $2, $3, $4, $5) returning id", [spaceId, owner, "Cafe", null, "123 Main St"]);
  const wishId = savedWish.rows[0].id;
  await db.query("insert into public.wish_checklist_items (wish_id, space_id, label) values ($1, $2, $3)", [wishId, spaceId, "Book a table"]);
  await db.query("insert into public.checkins (space_id, wish_id, created_by, note) values ($1, $2, $3, $4)", [spaceId, wishId, owner, "Great day"]);

  await as(partner);
  assert.equal((await db.query("select count(*)::int as count from public.wishes")).rows[0].count, 1);
  assert.equal((await db.query("select count(*)::int as count from public.checkins")).rows[0].count, 1);
  assert.equal((await db.query("select count(*)::int as count from public.wish_checklist_items")).rows[0].count, 1);
  await db.query("update public.wish_checklist_items set completed = true where wish_id = $1", [wishId]);

  await as(owner);
  await db.query("update public.space_members set display_name = 'Eric', avatar_url = 'https://example.com/avatar.jpg' where user_id = $1", [owner]);
  await db.query("update public.couple_spaces set background_photo = 'data:image/jpeg;base64,YQ==' where id = $1", [spaceId]);
  await rejects("update public.space_members set role = 'partner' where user_id = $1", [owner]);
  await rejects("update public.couple_spaces set background_photo = 'https://example.com/photo' where id = $1", [spaceId]);
  await as(partner);
  assert.equal((await db.query("select display_name from public.space_members where user_id = $1", [owner])).rows[0].display_name, 'Eric');
  await db.query("update public.space_members set display_name = 'Not Eric' where user_id = $1", [owner]);
  assert.equal((await db.query("select display_name from public.space_members where user_id = $1", [owner])).rows[0].display_name, 'Eric');
  assert.equal((await db.query("select background_photo from public.couple_spaces where id = $1", [spaceId])).rows[0].background_photo, 'data:image/jpeg;base64,YQ==');

  await as(outsider);
  assert.equal((await db.query("select count(*)::int as count from public.space_members")).rows[0].count, 0);
  await db.query("update public.couple_spaces set background_photo = null where id = $1", [spaceId]);
  assert.equal((await db.query("select count(*)::int as count from public.wishes")).rows[0].count, 0);
  assert.equal((await db.query("select count(*)::int as count from public.checkins")).rows[0].count, 0);
  assert.equal((await db.query("select count(*)::int as count from public.wish_checklist_items")).rows[0].count, 0);
  await rejects("select public.accept_space_invitation($1)", [token]);
  await rejects("insert into public.wishes (space_id, created_by, title, url) values ($1, $2, $3, $4)", [spaceId, outsider, "No", "https://example.com"]);
  await rejects("insert into public.checkins (space_id, wish_id, created_by) values ($1, $2, $3)", [spaceId, wishId, outsider]);
  await rejects("insert into public.wish_checklist_items (wish_id, space_id, label) values ($1, $2, $3)", [wishId, spaceId, "No"]);

  await as(owner);
  assert.equal((await db.query("select background_photo from public.couple_spaces where id = $1", [spaceId])).rows[0].background_photo, 'data:image/jpeg;base64,YQ==');
  await rejects("update public.couple_spaces set background_photo = $1 where id = $2", ['data:image/jpeg;base64,' + 'A'.repeat(1500000), spaceId]);
  await rejects("update public.space_members set avatar_url = 'javascript:alert(1)' where user_id = $1", [owner]);
  const event=(await db.query("insert into public.anniversaries(space_id,created_by,title,event_date) values($1,$2,'Our day','2024-02-29') returning id",[spaceId,owner])).rows[0].id;
  await db.query("insert into public.wish_plans(wish_id,space_id,date_on,budget) values($1,$2,'2026-10-01',80)",[wishId,spaceId]);
  await rejects("update public.wish_plans set budget=-1 where wish_id=$1",[wishId]);
  const memory=(await db.query("insert into public.memories(space_id,created_by,wish_id,byte_size) values($1,$2,$3,1000) returning id",[spaceId,owner,wishId])).rows[0].id;
  const photoPath=`${spaceId}/${memory}/photo.jpg`;
  await db.query("insert into storage.objects(bucket_id,name) values('couple-memories',$1)",[photoPath]);
  await rejects("insert into storage.objects(bucket_id,name) values('couple-memories',$1)",[`${spaceId}/unknown/photo.jpg`]);
  await db.query("update public.memories set photo_ready=true where id=$1",[memory]);
  await rejects("insert into storage.objects(bucket_id,name) values('couple-memories',$1)",[`${spaceId}/${memory}/thumb.jpg`]);
  const comment=(await db.query("insert into public.discussion_comments(space_id,created_by,anniversary_id,body) values($1,$2,$3,'Happy us ❤️') returning id",[spaceId,owner,event])).rows[0].id;
  await as(partner);
  assert.equal((await db.query("select count(*)::int as n from storage.objects")).rows[0].n,1);
  await db.query("update public.wish_plans set partner_task='Book tickets' where wish_id=$1",[wishId]);
  await db.query("delete from public.discussion_comments where id=$1",[comment]);
  assert.equal((await db.query("select count(*)::int as n from public.discussion_comments")).rows[0].n,1);
  await db.query("insert into public.comment_reactions(comment_id,space_id,user_id,emoji) values($1,$2,$3,'❤️')",[comment,spaceId,partner]);
  await rejects("insert into public.comment_reactions(comment_id,space_id,user_id,emoji) values($1,$2,$3,'👍')",[comment,spaceId,owner]);
  await as(outsider);
  for(const table of ['anniversaries','wish_plans','memories','discussion_comments','comment_reactions']) assert.equal((await db.query(`select count(*)::int as n from public.${table}`)).rows[0].n,0);
  assert.equal((await db.query("select count(*)::int as n from storage.objects")).rows[0].n,0);
  await rejects("insert into storage.objects(bucket_id,name) values('couple-memories',$1)",[`${spaceId}/${memory}/thumb.jpg`]);
  await rejects("insert into public.anniversaries(space_id,created_by,title,event_date) values($1,$2,'No','2026-01-01')",[spaceId,outsider]);
  const otherSpace=(await db.query("select public.create_couple_space('Other') as id")).rows[0].id;
  await rejects("insert into public.discussion_comments(space_id,created_by,anniversary_id,body) values($1,$2,$3,'Cross space')",[otherSpace,outsider,event]);
  await rejects("insert into public.memories(space_id,created_by,wish_id,byte_size) values($1,$2,$3,1000)",[otherSpace,outsider,wishId]);
  await as(owner);
  await db.query("delete from public.wishes where id=$1",[wishId]);
  assert.equal((await db.query("select wish_id from public.memories where id=$1",[memory])).rows[0].wish_id,null);
  await db.query("delete from public.anniversaries where id=$1",[event]);
  assert.equal((await db.query("select count(*)::int as n from public.comment_reactions")).rows[0].n,0);
  await db.query("insert into public.memories(space_id,created_by,byte_size) select $1,$2,100 from generate_series(1,199)",[spaceId,owner]);
  await rejects("insert into public.memories(space_id,created_by,byte_size) values($1,$2,100)",[spaceId,owner]);
  await db.query("delete from storage.objects where name=$1",[photoPath]);
  assert.equal((await db.query("select count(*)::int as n from storage.objects")).rows[0].n,0);
  await rejects("insert into public.space_pets(space_id,name,species,created_by,experience) values($1,'Mochi','cat',$2,999)",[spaceId,owner]);
  await rejects("insert into public.space_pets(space_id,name,species,created_by) values($1,'Mochi','cat',$2)",[spaceId,partner]);
  await rejects("insert into public.space_pets(space_id,name,species,created_by) values($1,'   ','cat',$2)",[spaceId,owner]);
  await db.query("insert into public.space_pets(space_id,name,species,created_by) values($1,'Mochi','cat',$2)",[spaceId,owner]);
  await rejects("insert into public.space_pets(space_id,name,species,created_by) values($1,'Second','dog',$2)",[spaceId,owner]);
  assert.equal((await db.query("select public.care_for_pet($1,'feed') as rewarded",[spaceId])).rows[0].rewarded,true);
  assert.equal((await db.query("select public.care_for_pet($1,'feed') as rewarded",[spaceId])).rows[0].rewarded,false);
  await rejects("update public.space_pets set experience=999 where space_id=$1",[spaceId]);
  await rejects("update public.space_pets set species='dog' where space_id=$1",[spaceId]);
  await rejects("delete from public.space_pets where space_id=$1",[spaceId]);
  await rejects("insert into public.pet_care(space_id,user_id,action) values($1,$2,'play')",[spaceId,owner]);
  await rejects("select public.care_for_pet($1,'invalid')",[spaceId]);
  await rejects("select public.care_for_pet($1,null)",[spaceId]);
  await as(partner);
  assert.equal((await db.query("select public.care_for_pet($1,'feed') as rewarded",[spaceId])).rows[0].rewarded,true);
  await db.query("update public.space_pets set name='Our Mochi' where space_id=$1",[spaceId]);
  assert.equal((await db.query("select experience from public.space_pets where space_id=$1",[spaceId])).rows[0].experience,20);
  assert.equal((await db.query("select count(*)::int as n from public.pet_care where space_id=$1",[spaceId])).rows[0].n,2);
  // Moving the fixture's care into yesterday simulates the next UTC day.
  await db.exec("reset role");
  await db.query("update public.pet_care set care_day=care_day-1 where space_id=$1",[spaceId]);
  await as(owner);
  assert.equal((await db.query("select public.care_for_pet($1,'feed') as rewarded",[spaceId])).rows[0].rewarded,true);
  assert.equal((await db.query("select experience from public.space_pets where space_id=$1",[spaceId])).rows[0].experience,30);
  // Apply the family migration to a populated legacy database, then verify preservation.
  await db.exec('reset role');
  for(const migration of migrations.filter(name=>name.endsWith('_pet_family.sql')))await db.exec(await readFile(new URL(migration,migrationsUrl),'utf8'));
  await as(owner);
  const originalPet=(await db.query('select id,experience from public.space_pets where space_id=$1',[spaceId])).rows[0];
  assert.equal(originalPet.experience,30);
  assert.equal((await db.query('select count(*)::int n from public.pet_care where pet_id=$1',[originalPet.id])).rows[0].n,3);
  assert.equal((await db.query("select public.care_for_named_pet($1,$2,'feed') rewarded",[spaceId,originalPet.id])).rows[0].rewarded,false);
  await as(outsider);
  assert.equal((await db.query("select count(*)::int as n from public.space_pets where space_id=$1",[spaceId])).rows[0].n,0);
  assert.equal((await db.query("select count(*)::int as n from public.pet_care where space_id=$1",[spaceId])).rows[0].n,0);
  await rejects("select public.care_for_pet($1,'play')",[spaceId]);
  await db.query("update public.space_pets set name='Intruder' where space_id=$1",[spaceId]);
  await as(owner);
  assert.equal((await db.query("select name from public.space_pets where space_id=$1",[spaceId])).rows[0].name,'Our Mochi');
  await db.exec("set role anon");
  await rejects("select public.care_for_pet($1,'play')",[spaceId]);
  await db.exec("reset role");
  assert.equal((await db.query("select has_table_privilege('anon','public.space_pets','SELECT') as allowed")).rows[0].allowed,false);
  await db.exec("reset role");
  await as(owner);
  const secondPet=(await db.query("insert into public.space_pets(space_id,name,species,created_by) values($1,'Buddy','dog',$2) returning id,slot",[spaceId,owner])).rows[0];
  assert.equal(secondPet.slot,2);
  await db.query("insert into public.space_pets(space_id,name,species,created_by) values($1,'Third','cat',$2),($1,'Fourth','dog',$2)",[spaceId,owner]);
  await rejects("insert into public.space_pets(space_id,name,species,created_by) values($1,'Fifth','cat',$2)",[spaceId,owner]);
  await rejects("insert into public.space_pets(space_id,name,species,created_by,slot) values($1,'Bypass','cat',$2,1)",[spaceId,owner]);
  assert.equal((await db.query("select public.care_for_named_pet($1,$2,'feed') rewarded",[spaceId,secondPet.id])).rows[0].rewarded,true);
  assert.equal((await db.query("select public.care_for_named_pet($1,$2,'feed') rewarded",[spaceId,secondPet.id])).rows[0].rewarded,false);
  assert.equal((await db.query('select experience from public.space_pets where id=$1',[originalPet.id])).rows[0].experience,30);
  assert.equal((await db.query('select experience from public.space_pets where id=$1',[secondPet.id])).rows[0].experience,10);
  await as(partner);
  assert.equal((await db.query("select public.care_for_named_pet($1,$2,'feed') rewarded",[spaceId,secondPet.id])).rows[0].rewarded,true);
  await db.query("update public.space_pets set name='Our Buddy' where id=$1",[secondPet.id]);
  assert.equal((await db.query('select name from public.space_pets where id=$1',[originalPet.id])).rows[0].name,'Our Mochi');
  await rejects("select public.care_for_named_pet($1,$2,'feed')",[otherSpace,secondPet.id]);
  await as(outsider);
  await rejects("select public.care_for_named_pet($1,$2,'play')",[spaceId,secondPet.id]);
  await db.exec('set role anon');
  await rejects("select public.care_for_named_pet($1,$2,'play')",[spaceId,secondPet.id]);
  await db.exec('reset role');
  console.log("Database permissions, legacy migration, four-pet cap and per-pet rewards passed.");
} finally {
  await db.close();
}
