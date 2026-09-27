import { coordinates, type Coordinates } from './wish-drafts';
export type SyncedWish = {
  id: string; title: string; note: string; url: string; address: string; category: string;
  status: 'wanted' | 'planned' | 'done'; plannedDate: string; completionNote: string;
  createdAt: string; location?: Coordinates | null; deletedAt?: string | null; version?: number;
  updatedBy?: string | null; updatedAt?: string;
  checklist: { id: string; label: string; completed: boolean; position: number }[];
};
export type PendingWish = { mutation: string; expected: number | null; wish: SyncedWish; problem?: string };
export function syncKey(user: string, space: string) { return `wish-together:sync:v1:${user}:${space}`; }
export function readPending(storage: Pick<Storage,'getItem'>, key: string): PendingWish[] {
  const raw = storage.getItem(key);
  if (!raw) return [];
  const rows = JSON.parse(raw);
  if (!Array.isArray(rows) || rows.some(p=>!p || typeof p.mutation!=='string' || !p.wish || typeof p.wish.id!=='string' || typeof p.wish.title!=='string' || !Array.isArray(p.wish.checklist))) throw new Error('Unreadable pending wishes');
  return rows;
}
export function overlayPending(wishes: SyncedWish[], pending: PendingWish[]) {
  const ids=new Set(pending.map(p=>p.wish.id));
  return [...pending.map(p=>p.wish),...wishes.filter(w=>!ids.has(w.id))];
}
export function rowWish(row: Record<string, unknown>, items: SyncedWish['checklist']): SyncedWish {
  return { id:String(row.id), title:String(row.title), note:String(row.note ?? ''), url:String(row.url ?? ''),
    address:String(row.address ?? ''), category:String(row.category ?? ''), status:row.status as SyncedWish['status'],
    plannedDate:String(row.planned_date ?? ''), completionNote:String(row.completed_note ?? ''), createdAt:String(row.created_at),
    location:coordinates(row), deletedAt:row.deleted_at as string|null, version:Number(row.version),
    updatedBy:row.updated_by as string|null, updatedAt:String(row.updated_at), checklist:items };
}
export async function syncLock<T>(key:string, work:()=>Promise<T>):Promise<T> {
  if (!navigator.locks) throw new Error('This browser cannot safely queue changes. Please use a current browser.');
  return navigator.locks.request(key,work);
}
// Called while holding the per-account/space Web Lock. Never remove before ACK.
export async function flushPending(storage:Pick<Storage,'getItem'|'setItem'>,key:string,send:(p:PendingWish)=>Promise<'saved'|'conflict'|'retry'|'blocked'>) {
  for(const p of readPending(storage,key)) {
    if(p.problem)continue;
    const outcome=await send(p);
    if(outcome==='retry')return false;
    const latest=readPending(storage,key);
    storage.setItem(key,JSON.stringify(outcome==='saved'?latest.filter(x=>x.mutation!==p.mutation):latest.map(x=>x.mutation===p.mutation?{...x,problem:outcome}:x)));
  }
  return true;
}
