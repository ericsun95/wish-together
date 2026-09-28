import type {SyncedWish} from './wish-sync';
import type {Anniversary} from './life';
export type TimelineMemory={id:string;space_id:string;wish_id:string|null;caption:string;taken_on:string;photo_ready:boolean;byte_size:number};
export type TimelineEntry={id:string;kind:'wish'|'memory'|'anniversary';date:string;title:string;note:string;wishId?:string;memory?:TimelineMemory;anniversary?:Anniversary};
export function dateOnly(input:string|undefined|null):string {
 if(!input)return '';
 if(/^\d{4}-\d{2}-\d{2}$/.test(input)){const [y,m,d]=input.split('-').map(Number);const date=new Date(Date.UTC(y,m-1,d));return date.getUTCFullYear()===y&&date.getUTCMonth()===m-1&&date.getUTCDate()===d?input:'';}
 const date=new Date(input);if(!Number.isFinite(date.getTime()))return '';
 return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
}
export function timelineEntries(wishes:SyncedWish[],memories:TimelineMemory[],anniversaries:Anniversary[],today:string):TimelineEntry[]{
 const entries:TimelineEntry[]=[];
 for(const w of wishes){if(w.deletedAt||w.status!=='done')continue;const date=dateOnly(w.completedAt);if(date>today)continue;entries.push({id:`wish:${w.id}`,kind:'wish',date,title:w.title,note:w.completionNote||w.note,wishId:w.id});}
 for(const m of memories){const date=dateOnly(m.taken_on);if(!m.photo_ready||!date||date>today)continue;entries.push({id:`memory:${m.id}`,kind:'memory',date,title:m.caption||wishes.find(w=>w.id===m.wish_id)?.title||'',note:'',memory:m});}
 for(const a of anniversaries){const date=dateOnly(a.event_date);if(!date||date>today)continue;entries.push({id:`anniversary:${a.id}`,kind:'anniversary',date,title:a.title,note:a.note,anniversary:a});}
 return entries.sort((a,b)=>b.date.localeCompare(a.date)||a.id.localeCompare(b.id));
}
export function groupTimeline(entries:TimelineEntry[]){const groups=new Map<string,TimelineEntry[]>();for(const e of entries){const month=e.date?e.date.slice(0,7):'undated';groups.set(month,[...(groups.get(month)||[]),e]);}return [...groups].map(([month,items])=>({month,items}));}
