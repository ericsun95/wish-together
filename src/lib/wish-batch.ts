import type {SyncedWish,PendingWish} from './wish-sync';
export type BatchAction='category'|'done'|'wanted'|'remove'|'restore';
export function batchChanges(wishes:SyncedWish[],ids:string[],action:BatchAction,category:string,now:string){
 const chosen=new Set(ids);
 return wishes.filter(w=>chosen.has(w.id)).map(w=>action==='category'?{...w,category:category.trim()}:action==='remove'?{...w,deletedAt:now}:action==='restore'?{...w,deletedAt:null}:action==='done'?{...w,status:'done' as const,plannedDate:'',completedAt:w.status==='done'?w.completedAt||null:now}:{...w,status:'wanted' as const,plannedDate:'',completedAt:null});
}
export function appendBatch(existing:PendingWish[],changes:SyncedWish[],makeId:()=>string):PendingWish[]{
 const seen=new Set(existing.map(p=>p.wish.id));
 for(const wish of changes){if(seen.has(wish.id)||!Number.isFinite(wish.version))throw Error('Wish is pending or has no version');seen.add(wish.id);}
 return [...existing,...changes.map(wish=>({wish,expected:wish.version!,mutation:makeId()}))];
}
