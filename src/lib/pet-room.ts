import type { PetSpecies } from './pet-catalog';
export type FurnitureKind = 'bed' | 'rug' | 'toy' | 'bowl';
export type Furniture = { id: string; kind: FurnitureKind; x: number; y: number };
export type RoomPet = { id: string; species: PetSpecies };
export type Actor = { x: number; y: number; targetX: number; targetY: number; activity: 'walk' | 'rest' | 'play' | 'eat' | 'hello'; until: number; furniture?: string };
export const FURNITURE = [
  { kind: 'bed', zh: '软软的窝', en: 'Cozy bed', icon: '🛏' },
  { kind: 'rug', zh: '圆圆地毯', en: 'Round rug', icon: '◉' },
  { kind: 'toy', zh: '玩具球', en: 'Play ball', icon: '🎾' },
  { kind: 'bowl', zh: '食盆', en: 'Food bowl', icon: '🥣' },
] as const;
export const DEFAULT_ROOM: Furniture[] = [
  {id:'bed',kind:'bed',x:24,y:52}, {id:'rug',kind:'rug',x:53,y:66},
  {id:'toy',kind:'toy',x:78,y:55}, {id:'bowl',kind:'bowl',x:80,y:84},
];
export function clampPosition(x: number, y: number) { return {x:Math.max(14,Math.min(86,x)), y:Math.max(48,Math.min(87,y))}; }
export function parseRoom(raw: string | null): Furniture[] {
  if (!raw) return DEFAULT_ROOM.map(f=>({...f}));
  try {
    const value: unknown = JSON.parse(raw);
    if (!Array.isArray(value) || value.length>12) throw Error();
    const ids = new Set<string>();
    return value.map(item=>{
      if (!item || typeof item.id!=='string' || ids.has(item.id) || !FURNITURE.some(f=>f.kind===item.kind) || !Number.isFinite(item.x) || !Number.isFinite(item.y)) throw Error();
      ids.add(item.id);return {id:item.id,kind:item.kind,...clampPosition(item.x,item.y)};
    });
  } catch { return DEFAULT_ROOM.map(f=>({...f})); }
}
export function initialActor(index:number): Actor { const x=20+(index%4)*20,y=51+Math.floor(index/4)*26;return {x,y,targetX:x,targetY:y,activity:'rest',until:Date.now()+1000+index*700}; }
export function advanceRoom(pets: RoomPet[], actors: Record<string,Actor>, furniture: Furniture[], now: number, random = Math.random): Record<string,Actor> {
  const next:Record<string,Actor>={};
  const reserved=new Set(pets.map(p=>actors[p.id]?.furniture).filter(Boolean));
  for (const [index,pet] of pets.entries()) {
    let a={...(actors[pet.id]||initialActor(index))};
    if (a.furniture&&!furniture.some(f=>f.id===a.furniture)) a={...a,furniture:undefined,until:0,activity:'rest'};
    const destination=furniture.find(f=>f.id===a.furniture);
    if(destination && (a.targetX!==destination.x || a.targetY!==destination.y-1)) a={...a,targetX:destination.x,targetY:destination.y-1,activity:'walk'};
    if (a.activity==='walk') {
      const dx=a.targetX-a.x,dy=a.targetY-a.y,d=Math.hypot(dx,dy);
      const speed=pet.species==='hamster'?2.2:pet.species==='dog'?3.8:3;
      if(d<=speed){
        const kind=furniture.find(f=>f.id===a.furniture)?.kind;
        a={...a,x:a.targetX,y:a.targetY,activity:kind==='toy'?'play':kind==='bowl'?'eat':'rest',until:now+(kind==='bed'?12000:5000)+random()*3000};
      }else{a.x+=dx/d*speed;a.y+=dy/d*speed;}
    } else if(now>=a.until){
      if(a.furniture)reserved.delete(a.furniture);
      const available=furniture.filter(f=>!reserved.has(f.id));
      const preferred=available.filter(f=>pet.species==='dog'?f.kind==='toy':f.kind==='bed'||f.kind==='rug');
      const choices=random()<.55&&preferred.length?preferred:available;
      const target=random()<.8?choices[Math.floor(random()*choices.length)]:undefined;
      const point=target?clampPosition(target.x,target.y-1):clampPosition(14+random()*72,48+random()*37);
      a={...a,targetX:point.x,targetY:point.y,activity:'walk',furniture:target?.id};
      if(target)reserved.add(target.id);
    }
    next[pet.id]=a;
  }
  return next;
}
