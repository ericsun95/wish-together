/** Deterministic, renderer-independent rules for the first solo adventure. */
export type Species = 'cat' | 'dog';
export type Point = { x: number; z: number };
export type Pet = Point & { y: number; heading: number };
export type Rect = { x: number; z: number; w: number; h: number };
export type Game = {
  version: 1; active: Species; pets: Record<Species, Pet>; stool: Point;
  grab: Point | null; powered: boolean; snack: boolean; coins: boolean[];
  elapsed: number; alert: number; catches: number; grace: number;
  robot: Point & { heading: number; waypoint: number }; won: boolean;
  event: string; eventId: number;
};
export type Input = { x: number; z: number };
export const ROOM = { w: 14, h: 10 };
export const BED = { x: 1.7, z: 8.3 };
export const DOCK = { x: 3.7, z: 2.9 };
export const SWITCH = { x: 7.3, z: 1.65 };
export const PLATE = { x: 8.9, z: 6.05 };
export const SNACK = { x: 12.3, z: 2.5 };
export const COINS = [{ x: 1.25, z: 3.05 }, { x: 8.4, z: 3 }, { x: 12.2, z: 6.25 }];
export const COUNTER = { x: .65, z: .55, w: 7.8, h: 1.65 };
export const ISLAND = { x: 5.35, z: 4.05, w: 1.9, h: 1.45 };
export const WALLS: Rect[] = [
  { x: 10.35, z: .4, w: .2, h: 4.8 },
  { x: 10.35, z: 6.9, w: .2, h: .5 },
  { x: 10.35, z: 7.3, w: 3.25, h: .2 },
];
export const GATE = { x: 10.35, z: 5.2, w: .2, h: 1.7 };
const PATROL = [{ x: 7.9, z: 3.5 }, { x: 9.65, z: 4.4 }, { x: 9.65, z: 7.85 }, { x: 5, z: 7.85 }, { x: 4.8, z: 3.5 }];
export const distance = (a: Point, b: Point) => Math.hypot(a.x - b.x, a.z - b.z);
const inside = (p: Point, rect: Rect, margin = 0) => p.x > rect.x - margin && p.x < rect.x + rect.w + margin && p.z > rect.z - margin && p.z < rect.z + rect.h + margin;
export function freshGame(): Game {
  return { version: 1, active: 'dog', pets: { cat: { x: 1.35, z: 7.8, y: 0, heading: 0 }, dog: { x: 2.65, z: 8.4, y: 0, heading: 0 } },
    stool: { x: 3.7, z: 5.85 }, grab: null, powered: false, snack: false, coins: [false, false, false], elapsed: 0, alert: 0, catches: 0, grace: 0,
    robot: { ...PATROL[0], heading: 0, waypoint: 1 }, won: false, event: 'welcome', eventId: 1 };
}
export function isDocked(s: Game) { return distance(s.stool, DOCK) < .05; }
export function gateOpen(s: Game) { return s.powered && distance(s.pets.dog, PLATE) < .65; }
export function phase(s: Game) { return s.won ? 5 : s.snack ? 4 : !isDocked(s) && !s.powered ? 0 : !s.powered ? 1 : !gateOpen(s) && s.pets.cat.x < 10.3 ? 2 : 3; }
export function stars(s: Game) { return s.won ? 1 + Number(s.coins.every(Boolean)) + Number(s.catches === 0) : 0; }
export function announce(s: Game, event: string) { s.event = event; s.eventId++; }
export function switchPet(s: Game) { if (s.won) return; s.grab = null; s.active = s.active === 'cat' ? 'dog' : 'cat'; announce(s, s.active === 'cat' ? 'catTurn' : 'dogTurn'); }

function obstacles(s: Game) { return [COUNTER, ISLAND, { x: 8.76, z: .525, w: 1.18, h: 1.45 }, ...WALLS, ...(!gateOpen(s) ? [GATE] : [])]; }
export function walkable(s: Game, p: Point, radius = .28, stool = false) {
  if (p.x < .4 + radius || p.x > 13.6 - radius || p.z < .4 + radius || p.z > 9.6 - radius) return false;
  if (obstacles(s).some(rect => inside(p, rect, radius))) return false;
  return stool || distance(p, s.stool) > .43 + radius;
}
function clearSight(s: Game, a: Point, b: Point) {
  const count = Math.ceil(distance(a, b) / .12);
  for (let i = 1; i < count; i++) {
    const p = { x: a.x + (b.x - a.x) * i / count, z: a.z + (b.z - a.z) * i / count };
    if (obstacles(s).some(rect => inside(p, rect))) return false;
  }
  return true;
}
export function action(s: Game): string {
  if (s.won) return 'finished';
  const pet = s.pets[s.active];
  if (s.active === 'dog' && s.grab) return 'release';
  if (s.active === 'dog' && distance(pet, s.stool) < 1.45 && !s.powered) return 'grab';
  if (s.active === 'cat' && pet.y > 0) return distance(pet, SWITCH) < 1 && !s.powered ? 'power' : 'down';
  if (s.active === 'cat' && isDocked(s) && distance(pet, s.stool) < 1.5 && !s.powered) return 'climb';
  if (s.active === 'cat' && distance(pet, SNACK) < 1.2 && !s.snack && s.powered) return 'snack';
  if (s.active === 'dog' && distance(pet, PLATE) < .8 && s.powered) return 'stay';
  return 'hint';
}
export function interact(s: Game) {
  const kind = action(s), pet = s.pets[s.active];
  if (kind === 'release') { s.grab = null; announce(s, isDocked(s) ? 'docked' : 'released'); }
  else if (kind === 'grab') { s.grab = { x: s.stool.x - pet.x, z: s.stool.z - pet.z }; announce(s, 'grabbed'); }
  else if (kind === 'climb') { pet.x = DOCK.x; pet.z = 1.65; pet.y = 1.1; announce(s, 'climbed'); }
  else if (kind === 'power') { s.powered = true; announce(s, 'powered'); }
  else if (kind === 'down') { pet.x = DOCK.x; pet.z = 3.8; pet.y = 0; announce(s, 'down'); }
  else if (kind === 'snack') { s.snack = true; announce(s, 'snack'); }
  else if (kind === 'stay') announce(s, 'stay');
  else if (kind === 'hint') announce(s, `hint${phase(s)}`);
}
function move(s: Game, input: Input, dt: number) {
  const p = s.pets[s.active], length = Math.hypot(input.x, input.z);
  if (length < .01) return false;
  const speed = s.grab ? 1.65 : s.active === 'cat' ? 2.75 : 2.5;
  const dx = input.x / Math.max(1, length) * speed * dt, dz = input.z / Math.max(1, length) * speed * dt;
  const before = { x: p.x, z: p.z };
  for (const [axis, delta] of [['x', dx], ['z', dz]] as const) {
    const next = { x: p.x, z: p.z, [axis]: p[axis] + delta };
    if (p.y > 0) { if (inside(next, { x: 1, z: .9, w: 7, h: 1 })) p[axis] = next[axis]; continue; }
    if (s.grab) {
      const stool = { x: next.x + s.grab.x, z: next.z + s.grab.z };
      if (walkable(s, next, .28, true) && walkable(s, stool, .44, true)) { p[axis] = next[axis]; s.stool = stool; }
    } else if (walkable(s, next)) p[axis] = next[axis];
  }
  if (s.grab && distance(s.stool, DOCK) < .28) { s.stool = { ...DOCK }; s.grab = null; announce(s, 'docked'); }
  const moving = distance(before, p) > .0001;
  if (moving) p.heading = Math.atan2(dx, dz);
  return moving;
}
export function tick(s: Game, input: Input, seconds: number) {
  if (s.won) return;
  const dt = Math.min(Math.max(seconds, 0), .05);
  s.elapsed += dt; s.grace = Math.max(0, s.grace - dt);
  const moving = move(s, input, dt), pet = s.pets[s.active];
  COINS.forEach((coin, i) => { if (!s.coins[i] && pet.y === 0 && distance(pet, coin) < .65) { s.coins[i] = true; announce(s, 'coin'); } });
  if (s.powered) {
    const target = PATROL[s.robot.waypoint], d = distance(s.robot, target);
    if (d < .08) s.robot.waypoint = (s.robot.waypoint + 1) % PATROL.length;
    else {
      const step = Math.min(d, dt * 1.12);
      s.robot.x += (target.x - s.robot.x) / d * step; s.robot.z += (target.z - s.robot.z) / d * step;
      s.robot.heading = Math.atan2(target.x - s.robot.x, target.z - s.robot.z);
    }
    const dx = pet.x - s.robot.x, dz = pet.z - s.robot.z, dPet = Math.hypot(dx, dz);
    const facing = dPet > 0 ? (dx * Math.sin(s.robot.heading) + dz * Math.cos(s.robot.heading)) / dPet : 1;
    const spotted = moving && pet.y === 0 && dPet < 2.7 && (facing > .62 || dPet < .7) && clearSight(s, s.robot, pet);
    s.alert = Math.max(0, Math.min(100, s.alert + (spotted && !s.grace ? 70 : -38) * dt));
    if (s.alert >= 100) {
      s.catches++; s.alert = 0; s.grace = 3; s.grab = null;
      Object.assign(pet, { x: s.active === 'cat' ? 1.35 : 2.65, z: 8.3, y: 0 });
      if (s.active === 'cat') s.snack = false;
      announce(s, 'caught');
    }
  }
  if (s.snack && distance(s.pets.cat, BED) < 1.45 && distance(s.pets.dog, BED) < 1.45) { s.won = true; announce(s, 'won'); }
}
/** Small 4-neighbour A* for tap-to-walk, using the same collision rules as keyboard movement. */
export function route(s: Game, target: Point): Point[] {
  const pet = s.pets[s.active];
  if (s.grab) return [];
  const valid = (p: Point) => pet.y > 0 ? inside(p, { x: 1, z: .9, w: 7, h: 1 }) : walkable(s, p, .32);
  const goal = { x: Math.round(target.x * 2) / 2, z: Math.round(target.z * 2) / 2 };
  if (!valid(goal)) return [];
  const key = (p: Point) => `${p.x},${p.z}`;
  const start = { x: Math.round(pet.x * 2) / 2, z: Math.round(pet.z * 2) / 2 };
  const open = [start], costs = new Map([[key(start), 0]]), from = new Map<string, Point>();
  for (let count = 0; open.length && count < 900; count++) {
    open.sort((a, b) => (costs.get(key(a))! + distance(a, goal)) - (costs.get(key(b))! + distance(b, goal)));
    const p = open.shift()!;
    if (distance(p, goal) < .1) {
      const path: Point[] = [p]; let current = p;
      while (from.has(key(current))) { current = from.get(key(current))!; path.unshift(current); }
      return path.slice(1);
    }
    for (const [x, z] of [[.5, 0], [-.5, 0], [0, .5], [0, -.5]]) {
      const next = { x: p.x + x, z: p.z + z }, cost = costs.get(key(p))! + .5;
      if (!valid(next) || cost >= (costs.get(key(next)) ?? Infinity)) continue;
      costs.set(key(next), cost); from.set(key(next), p); if (!open.some(n => key(n) === key(next))) open.push(next);
    }
  }
  return [];
}
export function restoreGame(raw: string | null): Game | null {
  if (!raw) return null;
  try {
    const value = JSON.parse(raw) as Game;
    if (value.version !== 1 || !['cat', 'dog'].includes(value.active) || typeof value.powered !== 'boolean' || typeof value.snack !== 'boolean' || typeof value.won !== 'boolean') return null;
    const point = (p: Point) => p && Number.isFinite(p.x) && Number.isFinite(p.z) && p.x >= .4 && p.x <= 13.6 && p.z >= .4 && p.z <= 9.6;
    if (!point(value.stool) || !point(value.robot) || ![value.pets?.cat, value.pets?.dog].every(p => point(p) && [0, 1.1].includes(p.y) && Number.isFinite(p.heading))) return null;
    if (value.pets.dog.y !== 0 || !Array.isArray(value.coins) || value.coins.length !== 3 || value.coins.some(v => typeof v !== 'boolean')) return null;
    if (![value.elapsed, value.catches, value.robot.waypoint].every(v => Number.isFinite(v) && v >= 0) || value.elapsed > 1e7 || !Number.isInteger(value.catches) || !Number.isInteger(value.robot.waypoint) || value.robot.waypoint >= PATROL.length) return null;
    return { ...freshGame(), active: value.active, pets: value.pets, stool: value.stool, powered: value.powered, snack: value.snack, coins: value.coins, elapsed: value.elapsed, catches: value.catches, robot: { ...value.robot, heading: Number.isFinite(value.robot.heading) ? value.robot.heading : 0 }, won: value.won, event: 'resumed', eventId: 1 };
  } catch { return null; }
}
