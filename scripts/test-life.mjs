import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';
const source=fs.readFileSync(new URL('../src/lib/life.ts',import.meta.url),'utf8');
const js=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText;
const {anniversaryDays,daysTogether,pickWish,nextPlannedWish}=await import(`data:text/javascript;base64,${Buffer.from(js).toString('base64')}`);
assert.equal(anniversaryDays('2024-02-29',true,'2025-02-28'),0);
assert.equal(anniversaryDays('2024-02-29',true,'2025-03-01'),364);
assert.equal(anniversaryDays('2020-01-01',true,'2026-12-31'),1);
assert.equal(anniversaryDays('2026-09-21',false,'2026-09-22'),-1);
assert.equal(anniversaryDays('2028-10-01',true,'2026-10-01'),731);
assert.equal(daysTogether('2026-03-07','2026-03-09'),3);
assert.equal(daysTogether('2027-01-01','2026-09-22'),0);
const wishes=[{id:'1',status:'done',category:'Food'},{id:'2',status:'wanted',category:'Food'},{id:'3',status:'planned',category:'Travel'}];
assert.equal(pickWish(wishes,'Food').id,'2');
assert.equal(pickWish(wishes,'', '2',()=>0).id,'3');
assert.equal(pickWish(wishes,'Unknown'),null);
assert.equal(pickWish([],''),null);
const datedWishes=[
  {id:'past',status:'planned',plannedDate:'2026-09-22'},
  {id:'done',status:'done',plannedDate:'2026-09-23'},
  {id:'later',status:'planned',plannedDate:'2026-10-01'},
  {id:'today',status:'planned',plannedDate:'2026-09-23'},
  {id:'undated',status:'wanted',plannedDate:''},
];
assert.equal(nextPlannedWish(datedWishes,'2026-09-23').id,'today');
assert.equal(nextPlannedWish(datedWishes,'2026-09-24').id,'later');
assert.equal(nextPlannedWish(datedWishes,'2026-10-02'),null);
assert.equal(nextPlannedWish([],'2026-09-23'),null);
assert.equal(datedWishes[0].id,'past');
const petSource=fs.readFileSync(new URL('../src/lib/pet-play.ts',import.meta.url),'utf8');
const petJs=ts.transpileModule(petSource,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText;
const {keepPetOnScreen}=await import(`data:text/javascript;base64,${Buffer.from(petJs).toString('base64')}`);
assert.deepEqual(keepPetOnScreen(-100,-100,390,844),{x:8,y:8});
assert.deepEqual(keepPetOnScreen(2000,2000,390,844),{x:286,y:740});
assert.deepEqual(keepPetOnScreen(120,180,390,844),{x:120,y:180});
assert.deepEqual(keepPetOnScreen(500,700,320,568),{x:216,y:464});
console.log('Anniversary rollover, date selection, random-wish filters and pet viewport bounds passed.');
