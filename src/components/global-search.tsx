'use client';
import { useEffect,useState } from 'react';
import { LifeModal } from './life-ui';
import { spaceRows } from '@/lib/space-export';
import type { SyncedWish } from '@/lib/wish-sync';
export function GlobalSearch({wishes,space,zh,onClose,onWish,onMemory}:{wishes:SyncedWish[];space:string|null;zh:boolean;onClose:()=>void;onWish:(w:SyncedWish)=>void;onMemory:(id:string)=>void}){
  const [query,setQuery]=useState(''),[memories,setMemories]=useState<Record<string,unknown>[]>([]),[notice,setNotice]=useState(''),[retry,setRetry]=useState(0);
  useEffect(()=>{let active=true;if(space){setNotice(zh?'正在加载回忆索引…':'Loading memories…');void spaceRows('memories',space,'id,caption,taken_on,wish_id').then(rows=>{if(active){setMemories(rows);setNotice('');}}).catch(()=>{if(active)setNotice(zh?'回忆暂时无法加载；仍可搜索已载入的心愿和地点。':'Memories unavailable. You can still search loaded wishes and places.');});}return()=>{active=false;};},[space,zh,retry]);
  const words=query.toLocaleLowerCase().trim().split(/\s+/).filter(Boolean);const match=(text:string)=>words.every(w=>text.toLocaleLowerCase().includes(w));
  const found=words.length?wishes.filter(w=>!w.deletedAt&&match([w.title,w.note,w.address,w.category,w.completionNote,w.plannedDate].join(' '))):[];
  const photos=words.length?memories.filter(m=>match([m.caption,m.taken_on,wishes.find(w=>w.id===m.wish_id)?.title].join(' '))):[];
  return <LifeModal title={zh?'找一找':'Search everything'} onClose={onClose}><label>{zh?'心愿、地点、回忆':'Wishes, places, memories'}<input autoFocus type="search" value={query} placeholder={zh?'例如：海边、生日、那家咖啡店':'Beach, birthday, that café…'} onChange={e=>setQuery(e.target.value)}/></label>{notice&&<p role="status">{notice}<button onClick={()=>setRetry(n=>n+1)}>{zh?'重新加载':'Reload'}</button></p>}<p className="life-muted" aria-live="polite">{words.length?`${found.length+photos.length} ${zh?'条结果':'results'}`:zh?'输入关键词，找回想做的事和一起的回忆。':'Find a wish or a shared memory.'}</p><div className="search-results">{found.map(w=><button key={w.id} onClick={()=>onWish(w)}><small>{zh?'心愿 / 地点':'Wish / Place'}</small><strong>{w.title}</strong><span>{w.address||w.note||w.completionNote}</span></button>)}{photos.map(m=><button key={String(m.id)} onClick={()=>onMemory(String(m.id))}><small>{zh?'回忆':'Memory'} · {String(m.taken_on)}</small><strong>{String(m.caption||wishes.find(w=>w.id===m.wish_id)?.title||(zh?'一张回忆':'A memory'))}</strong></button>)}</div></LifeModal>;
}
