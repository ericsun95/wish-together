'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { appendBatch } from '@/lib/wish-batch';
import { supabase } from '@/lib/supabase';
import { flushPending, overlayPending, readPending, syncKey, syncLock, type PendingWish, type SyncedWish } from '@/lib/wish-sync';
export function useWishSync(user:string|null, space:string|null, zh:boolean) {
  const key=user&&space?syncKey(user,space):null;
  const [snapshot,setSnapshot]=useState<{key:string|null;rows:PendingWish[]}>({key:null,rows:[]}),[offline,setOffline]=useState(false),[issue,setIssue]=useState('');
  const pending=snapshot.key===key?snapshot.rows:[];
  const scope=useRef(key); scope.current=key;
  const notify=useCallback(()=>window.dispatchEvent(new Event('wish-queue-changed')),[]);
  const refresh=useCallback(()=>{try{setSnapshot({key,rows:key?readPending(localStorage,key):[]});}catch{setIssue(zh?'待同步数据无法读取，请先导出备份，勿清除浏览器数据。':'Pending data could not be read. Export a backup before clearing browser data.');}},[key,zh]);
  const flush=useCallback(async()=>{
    if(!key||!space||!supabase||!navigator.onLine)return;
    const client=supabase;
    try { await syncLock(key,async()=>{
      const finished=await flushPending(localStorage,key,async p=>{
        if(scope.current!==key)return 'retry';
        const {data:{session}}=await client.auth.getSession();
        if(session?.user.id!==user)return 'retry';
        const {error}=await client.rpc('save_wish',{p_id:p.wish.id,p_space:space,p_expected:p.expected,p_mutation:p.mutation,p_payload:p.wish,p_items:p.wish.checklist});
        if(scope.current!==key)return 'retry';
        if(!error)return 'saved';
        if(error.message.includes('wish_conflict'))return 'conflict';
        if(error.code && /^(22|23|42|P0001)/.test(error.code))return 'blocked';
        return 'retry';
      });
      setIssue(finished?'':zh?'暂未同步成功，内容仍保存在此设备，联网后会重试。':'Not synced yet. Saved on this device; we will retry.');
    }); } catch {if(scope.current===key)setIssue(zh?'同步暂不可用，请保留此设备上的内容。':'Sync is unavailable. Keep the content on this device.');}
    if(scope.current===key){notify();window.dispatchEvent(new Event('life-changed'));}
  },[key,space,user,zh,notify]);
  useEffect(()=>{setIssue('');refresh();const online=()=>{setOffline(!navigator.onLine);if(navigator.onLine)void flush();};online();const timer=setInterval(()=>void flush(),30000);window.addEventListener('online',online);window.addEventListener('offline',online);window.addEventListener('wish-queue-changed',refresh);window.addEventListener('storage',refresh);return()=>{clearInterval(timer);window.removeEventListener('online',online);window.removeEventListener('offline',online);window.removeEventListener('wish-queue-changed',refresh);window.removeEventListener('storage',refresh);};},[refresh,flush]);
  async function retry(){if(!key)return;try{await syncLock(key,async()=>{const rows=readPending(localStorage,key);localStorage.setItem(key,JSON.stringify(rows.map(p=>p.problem==='blocked'?{...p,problem:undefined}:p)));});notify();void flush();}catch{setIssue(zh?'暂时无法重试，内容已保留。':'Could not retry. Your content was kept.');}}
  async function enqueue(wish:SyncedWish,expected:number|null) {
    if(!key)throw new Error('Missing account');
    await syncLock(key,async()=>{
      const rows=readPending(localStorage,key);
      if(rows.some(p=>p.wish.id===wish.id))throw new Error('Already pending');
      localStorage.setItem(key,JSON.stringify([...rows,{wish,expected,mutation:crypto.randomUUID()}]));
    });notify();void flush();
  }
  async function enqueueMany(changes:SyncedWish[]){if(!key)throw Error('Missing account');await syncLock(key,async()=>{if(scope.current!==key)throw Error('Account changed');const next=appendBatch(readPending(localStorage,key),changes,()=>crypto.randomUUID());localStorage.setItem(key,JSON.stringify(next));});notify();void flush();}
  async function resolve(mutation:string,copy:boolean) {
    if(!key)return;
    try {await syncLock(key,async()=>{const rows=readPending(localStorage,key);localStorage.setItem(key,JSON.stringify(rows.flatMap(p=>p.mutation!==mutation?[p]:copy?[{wish:{...p.wish,id:crypto.randomUUID(),version:undefined,deletedAt:null,checklist:p.wish.checklist.map(i=>({...i,id:crypto.randomUUID()}))},expected:null,mutation:crypto.randomUUID()}]:[])));});notify();window.dispatchEvent(new Event('life-changed'));void flush();}catch{setIssue(zh?'处理失败，内容已保留。':'Could not update. Your content was kept.');}
  }
  return {pending,offline,issue,enqueue,enqueueMany,flush,retry,resolve,key,overlay:(w:SyncedWish[])=>overlayPending(w,pending)};
}
export function SyncStatus({sync,zh,onInspect}:{sync:ReturnType<typeof useWishSync>;zh:boolean;onInspect:(wish:SyncedWish)=>void}) {
  if(!sync.offline&&!sync.pending.length&&!sync.issue)return null;
  return <section className="sync-status" aria-label={zh?'同步状态':'Sync status'}><p role="status">{sync.offline?(zh?'离线中 · 可以继续记心愿':'Offline · You can still record wishes'):zh?'同步状态':'Sync status'}{sync.pending.length>0&&` · ${sync.pending.length} ${zh?'条保存在此设备，待同步':'saved on this device, waiting to sync'}`}</p>{sync.issue&&<p>{sync.issue}</p>}{sync.pending.map(p=><div key={p.mutation}><span>{p.wish.title}{p.problem&&(p.problem==='conflict'?(zh?' · 云端内容已变化':' · Changed in the cloud'):(zh?' · 无法提交，请查看内容或检查空间权限':' · Could not submit. Check content or space access'))}</span><button onClick={()=>onInspect(p.wish)}>{zh?'查看我的版本':'View my version'}</button>{p.problem&&<><button onClick={()=>void sync.resolve(p.mutation,true)}>{zh?'另存为新心愿':'Save as a new wish'}</button><button onClick={()=>{if(confirm(zh?'放弃这条保存在此设备、尚未同步的修改？云端内容不会被删除。':'Discard these unsynced local changes? Cloud content will not be deleted.'))void sync.resolve(p.mutation,false);}}>{p.problem==='conflict'?(zh?'保留云端版本':'Keep cloud version'):(zh?'放弃此条待同步内容':'Discard pending changes')}</button></>}</div>)}{!sync.offline&&<button className="text-action" onClick={()=>void sync.retry()}>{zh?'重试同步':'Retry sync'}</button>}</section>;
}
