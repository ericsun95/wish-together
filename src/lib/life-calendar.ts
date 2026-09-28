import type {SyncedWish} from './wish-sync';
import type {Anniversary} from './life';
export type CalendarEntry={id:string;date:string;kind:'wish'|'done'|'anniversary';title:string;wish?:SyncedWish;anniversary?:Anniversary};
export function validDay(value:string){if(!/^\d{4}-\d{2}-\d{2}$/.test(value))return false;const d=new Date(`${value}T12:00:00Z`);return Number.isFinite(d.getTime())&&d.toISOString().slice(0,10)===value;}
export function shiftMonth(month:string,delta:number){const [y,m]=month.split('-').map(Number);const d=new Date(Date.UTC(y,m-1+delta,1));return d.toISOString().slice(0,7);}
export function monthCells(month:string){const first=new Date(`${month}-01T12:00:00Z`);const offset=(first.getUTCDay()+6)%7;return Array.from({length:42},(_,i)=>{const d=new Date(first);d.setUTCDate(1-offset+i);return d.toISOString().slice(0,10);});}
export function calendarEntries(wishes:SyncedWish[],anniversaries:Anniversary[],month:string):CalendarEntry[]{
 const cells=monthCells(month),start=cells[0],end=cells[41],entries:CalendarEntry[]=[];
 for(const wish of wishes){if(wish.deletedAt)continue;let date=wish.plannedDate;
  if(wish.status==='done'){const d=wish.completedAt?new Date(wish.completedAt):null;date=d&&Number.isFinite(d.getTime())?`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`:'';}
  if(validDay(date)&&date>=start&&date<=end)entries.push({id:`wish:${wish.id}`,date,kind:wish.status==='done'?'done':'wish',title:wish.title,wish});
 }
 for(const anniversary of anniversaries){if(!validDay(anniversary.event_date))continue;const [original,m,d]=anniversary.event_date.split('-').map(Number);
  for(let year=Number(start.slice(0,4));year<=Number(end.slice(0,4));year++){if(year<original||(!anniversary.repeats_yearly&&year!==original))continue;const day=Math.min(d,new Date(Date.UTC(year,m,0)).getUTCDate());const date=`${year}-${String(m).padStart(2,'0')}-${String(day).padStart(2,'0')}`;if(date>=start&&date<=end)entries.push({id:`anniversary:${anniversary.id}:${year}`,date,kind:'anniversary',title:anniversary.title,anniversary});}
 }
 return entries.sort((a,b)=>a.date.localeCompare(b.date)||a.kind.localeCompare(b.kind)||a.id.localeCompare(b.id));
}
