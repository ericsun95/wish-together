import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';
async function load(file){const source=fs.readFileSync(new URL(file,import.meta.url),'utf8');return import(`data:text/javascript;base64,${Buffer.from(ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText).toString('base64')}`);}
const {petPhase}=await load('../src/lib/pet-rhythm.ts');
for(const [hour,phase] of [[0,'night'],[6,'night'],[7,'morning'],[10,'morning'],[11,'day'],[17,'day'],[18,'evening'],[21,'evening'],[22,'night'],[23,'night']])assert.equal(petPhase(hour),phase);
const {validDay,shiftMonth,monthCells,calendarEntries}=await load('../src/lib/life-calendar.ts');
assert.equal(validDay('2026-02-29'),false);assert.equal(validDay('2028-02-29'),true);assert.equal(shiftMonth('2026-12',1),'2027-01');assert.equal(shiftMonth('2026-01',-1),'2025-12');
const cells=monthCells('2026-02');assert.equal(cells.length,42);assert.equal(new Set(cells).size,42);assert.equal(cells[0],'2026-01-26');assert.equal(cells[41],'2026-03-08');
const wish={id:'a',title:'Our plan',status:'planned',plannedDate:'2026-02-05'};
const dates=[{id:'leap',title:'Leap day',event_date:'2024-02-29',repeats_yearly:true},{id:'once',title:'Once only',event_date:'2024-02-04',repeats_yearly:false},{id:'future',title:'Future',event_date:'2027-02-05',repeats_yearly:true}];
const rows=calendarEntries([wish,{...wish,id:'deleted',deletedAt:'2026-01-01'},{...wish,id:'unknown',status:'done',completedAt:null},{...wish,id:'invalid',plannedDate:'2026-02-31'}],dates,'2026-02');
assert.deepEqual(rows.map(e=>[e.id,e.date]),[['wish:a','2026-02-05'],['anniversary:leap:2026','2026-02-28']]);
assert.equal(calendarEntries([],dates,'2028-02').find(e=>e.anniversary.id==='leap').date,'2028-02-29');
process.env.TZ='America/Los_Angeles';const completed=calendarEntries([{...wish,status:'done',completedAt:'2026-02-06T01:00:00Z'}],[],'2026-02');assert.equal(completed[0].date,'2026-02-05');assert.equal(completed[0].kind,'done');
assert.equal(calendarEntries([], [{id:'newyear',title:'New year',event_date:'2020-01-01',repeats_yearly:true}],'2026-12')[0].date,'2027-01-01');
const {defaultNavigation,readNavigation,scrollKey}=await load('../src/lib/navigation-memory.ts');const state={...defaultNavigation(),view:'life',lifeTab:'calendar',calendarMonth:'2028-02',calendarDay:'2028-02-29'};const restored=readNavigation({getItem:()=>JSON.stringify({state})},'test');assert.equal(restored.state.calendarDay,'2028-02-29');assert.equal(scrollKey(restored.state),'life:calendar:2028-02');
state.calendarDay='2028-02-31';assert.equal(readNavigation({getItem:()=>JSON.stringify({state})},'test').state.calendarDay,'2028-02-01');
console.log('Companion rhythms, calendar recurrence, month boundaries, completion dates and remembered selection passed.');
