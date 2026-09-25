import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';
const source = fs.readFileSync(new URL('../src/lib/adventure/game.ts', import.meta.url), 'utf8');
const js = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText;
const { freshGame, action, interact, tick, route, tapRoute, switchPet, isDocked, gateOpen, restoreGame, stars, distance, BED, DOCK, PLATE, SNACK } = await import(`data:text/javascript;base64,${Buffer.from(js).toString('base64')}`);
function go(s, target) {
  const path = route(s, target);
  assert.ok(path.length || distance(s.pets[s.active], target) < .4, `No route to ${JSON.stringify(target)}`);
  for (const p of path) {
    let frames = 0;
    while (distance(s.pets[s.active], p) > .13) {
      if (s.won) return;
      assert.ok(frames++ < 700, `Stuck ${s.active}: ${JSON.stringify(s.pets[s.active])} -> ${JSON.stringify(p)}`);
      // Waiting is an intentional stealth mechanic: the robot only detects movement.
      if (s.alert > 35) { for (let i = 0; i < 30; i++) tick(s, { x: 0, z: 0 }, 1 / 60); continue; }
      const pet = s.pets[s.active], d = distance(pet, p);
      tick(s, { x: (p.x - pet.x) / d, z: (p.z - pet.z) / d }, 1 / 60);
    }
  }
}
const s = freshGame();
assert.equal(action(s), 'hint');
assert.equal(route(s, SNACK).length, 0, 'Closed pantry cannot be bypassed');
go(s, { x: 3.5, z: 7 }); interact(s); assert.ok(s.grab);
for (let i = 0; i < 150 && !isDocked(s); i++) tick(s, { x: 0, z: -1 }, 1 / 60);
assert.ok(isDocked(s), 'Stool can be parked through ordinary movement'); assert.equal(s.grab, null);
switchPet(s); go(s, { x: 1.5, z: 3 }); assert.ok(s.coins[0]);
go(s, { x: 3.5, z: 4 }); assert.equal(action(s), 'climb'); interact(s); assert.equal(s.pets.cat.y, 1.1);
go(s, { x: 7.5, z: 1.5 }); assert.equal(action(s), 'power'); interact(s); assert.ok(s.powered);
interact(s); assert.equal(s.pets.cat.y, 0);
switchPet(s); go(s, { x: 9, z: 6 }); assert.ok(gateOpen(s));
const dogAtPad = { ...s.pets.dog }; switchPet(s);
go(s, { x: 8.5, z: 3 }); go(s, { x: 12, z: 6.5 }); go(s, { x: 12, z: 3 });
assert.deepEqual(s.pets.dog, dogAtPad, 'Inactive dog remains on the pressure pad');
assert.equal(action(s), 'snack'); interact(s); assert.ok(s.snack);
const saved = restoreGame(JSON.stringify(s)); assert.ok(saved?.snack); assert.ok(gateOpen(saved));
go(s, { x: 12, z: 6 }); go(s, { x: 9, z: 6 }); go(s, { x: 1.5, z: 8.5 });
assert.equal(s.won, false, 'Both pets must come home'); switchPet(s); go(s, { x: 2, z: 8.5 }); tick(s, { x: 0, z: 0 }, .02);
assert.ok(s.won); assert.equal(stars(s), 3); const time = s.elapsed; tick(s, { x: 1, z: 0 }, .05); assert.equal(s.elapsed, time, 'Completed runs stop timing');
const blocked = freshGame(); blocked.pets.cat = { x: 10, z: 6, y: 0, heading: 0 }; blocked.active = 'cat';
for (let i = 0; i < 120; i++) tick(blocked, { x: 1, z: 0 }, 1 / 60);
assert.ok(blocked.pets.cat.x < 10.35, 'Movement cannot cross a closed gate');
const caught = freshGame(); caught.powered = true; caught.snack = true; caught.active = 'cat'; caught.alert = 99;
caught.pets.cat = { x: caught.robot.x + .3, z: caught.robot.z + .1, y: 0, heading: 0 };
tick(caught, { x: .1, z: 1 }, .05); assert.equal(caught.catches, 1); assert.equal(caught.snack, false); assert.equal(caught.powered, true); assert.ok(distance(caught.pets.cat, BED) < 1.45);
for (const raw of ['null', '{}', 'bad', JSON.stringify({ ...s, pets: { ...s.pets, cat: { x: 999, z: 2, y: 0, heading: 0 } } }), JSON.stringify({ ...s, robot: { ...s.robot, waypoint: 99 } })]) assert.equal(restoreGame(raw), null);
assert.equal(restoreGame(JSON.stringify({ ...freshGame(), grab: { x: 1, z: 1 }, alert: 99 }))?.grab, null, 'Resume clears transient controls');
console.log('PASS: complete three-star solo run with real movement/pathfinding; collision and gate rules; parked partner; capture checkpoint; save validation; completion freeze.');

const partySource = fs.readFileSync(new URL('../src/lib/adventure/party.ts', import.meta.url), 'utf8');
const partyJs = ts.transpileModule(partySource, {compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText;
const {selectParty}=await import(`data:text/javascript;base64,${Buffer.from(partyJs).toString('base64')}`);
const family=[{id:'c1',species:'cat',name:'Cream',appearance:'silver'},{id:'d1',species:'dog',name:'Snow',appearance:'pom'},{id:'c2',species:'cat',name:'Tabby',appearance:'classic'},{id:'r',species:'rabbit',name:'Bun',appearance:'lop'}];
assert.equal(selectParty([],{}),null);
assert.equal(selectParty(family.filter(p=>p.species!=='dog'),{}),null,'A rabbit cannot silently replace a missing dog');
assert.equal(selectParty(family,{}).cat.appearance,'silver');
assert.equal(selectParty(family,{cat:'c2'}).cat.name,'Tabby');
assert.equal(selectParty(family,{cat:'deleted',dog:'c1'}).dog.id,'d1','Deleted or wrong-species preferences safely fall back to adopted pets');
assert.equal(selectParty(family,{cat:'deleted'}).cat.id,'c1');
assert.equal(selectParty(family.map(p=>p.id==='d1'?{...p,name:'Renamed'}:p),{}).dog.name,'Renamed');
console.log('Adventure family selection: owned appearances, names, multiple pets, missing species and stale preferences passed.');

const tap = freshGame();
const approach = tapRoute(tap, tap.stool);
assert.ok(approach.length, 'A stool click routes to a reachable interaction point');
assert.ok(distance(approach.at(-1), tap.stool) < 1.2);
for(const point of approach){for(let i=0;i<700&&distance(tap.pets.dog,point)>.15;i++){const d=distance(tap.pets.dog,point);tick(tap,{x:(point.x-tap.pets.dog.x)/d,z:(point.z-tap.pets.dog.z)/d},1/60);}}
assert.equal(action(tap),'grab','Tap movement must stop inside the actual interaction range');
assert.equal(tapRoute(tap, SNACK).length, 0, 'Object snapping cannot bypass a closed gate');
assert.equal(tapRoute(tap, {x:-1,z:5}).length, 0);
const cameraSource=fs.readFileSync(new URL('../src/lib/adventure/map-camera.ts',import.meta.url),'utf8');
const cameraJs=ts.transpileModule(cameraSource,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText;
const {mapFrame,mapPick}=await import(`data:text/javascript;base64,${Buffer.from(cameraJs).toString('base64')}`);
for(const [w,h] of [[1200,450],[390,450],[800,220]])for(const zoom of [1,1.5,2])for(const focus of [BED,SNACK]){
  const frame=mapFrame(w,h,zoom,focus),x=(frame.left+focus.x*frame.unit)/w,y=(frame.top+focus.z*frame.unit)/h;
  const picked=mapPick(frame,w,h,x,y);assert.ok(distance(picked,focus)<1e-9,'Zoom and follow keep clicking aligned');
  assert.ok(x>=0&&x<=1&&y>=0&&y<=1,'Followed pet stays visible');
}
const fit=mapFrame(1200,450,1,BED);assert.equal(mapPick(fit,1200,450,0,0),null,'Outside-map clicks are ignored');
console.log('Map: object approach, closed gate, zoom/follow picking and viewport bounds passed.');

interact(tap);assert.ok(tap.grab);
const park=tapRoute(tap,DOCK)[0];
for(let i=0;i<700&&!isDocked(tap);i++){const d=distance(tap.pets.dog,park);tick(tap,{x:(park.x-tap.pets.dog.x)/Math.max(.01,d),z:(park.z-tap.pets.dog.z)/Math.max(.01,d)},1/60);}
assert.ok(isDocked(tap),'Clicking the dock while dragging places the stool, accounting for the grip offset');
