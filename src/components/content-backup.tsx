'use client';
import { useState } from 'react';
import { strToU8, zip } from 'fflate';
import { LifeModal } from './life-ui';
import { supabase } from '@/lib/supabase';
import { downloadBlob,spaceRows } from '@/lib/space-export';
import type { SyncedWish,PendingWish } from '@/lib/wish-sync';
export function ContentBackup({space,wishes,pending,zh,onClose}:{space:string|null;wishes:SyncedWish[];pending:PendingWish[];zh:boolean;onClose:()=>void}){
 const [busy,setBusy]=useState(false),[status,setStatus]=useState(''),[result,setResult]=useState<Blob|null>(null),[partial,setPartial]=useState(false);
 async function prepare(){if(busy)return;setBusy(true);setResult(null);setStatus(zh?'正在整理文字与照片…':'Collecting text and photos…');const failures:string[]=[];const files:Record<string,Uint8Array>={};const records:Record<string,unknown>={format:'wish-together-backup-v1',exportedAt:new Date().toISOString(),localWishes:wishes,pending};
 try{
  if(space&&supabase){for(const table of ['wishes','wish_checklist_items','memories','anniversaries','wish_plans','discussion_comments','checkins','space_pets']){try{records[table]=await spaceRows(table,space);}catch{failures.push(`Could not read ${table}`);}}
  const photos=(records.memories||[]) as {id:string;photo_ready:boolean}[];
  for(let i=0;i<photos.length;i++){const m=photos[i];if(!m.photo_ready){failures.push(`Photo incomplete: ${m.id}`);continue;}setStatus(`${zh?'正在整理照片':'Collecting photos'} ${i+1}/${photos.length}`);for(const name of ['photo','thumb']){const path=`${space}/${m.id}/${name}.jpg`;try{const {data,error}=await supabase.storage.from('couple-memories').download(path);if(error||!data)throw error;files[`photos/${m.id}/${name}.jpg`]=new Uint8Array(await data.arrayBuffer());}catch{failures.push(`Missing: photos/${m.id}/${name}.jpg`);}}}}
  records.failures=failures;files['records.json']=strToU8(JSON.stringify(records,null,2));files['wishes.txt']=strToU8(wishes.map(w=>`${w.title}\n${w.note}\n${w.address}\n${w.completionNote}\n${w.url}`).join('\n\n──────────\n\n'));files['README.txt']=strToU8('Wish Together backup\nContains personal content. Keep this file somewhere private.\nrecords.json: cloud records + local wishes + unsynced changes.\nphotos/: stored album photos and thumbnails (compressed originals as stored by the app).\nThis is an export, not an automatic restore file. Pet/game activity history and account credentials are not included.\n'+(failures.length?'PARTIAL EXPORT:\n'+failures.join('\n'):'All requested records and album photos were exported.'));
  const bytes=await new Promise<Uint8Array>((resolve,reject)=>zip(files,{level:0},(error,data)=>error?reject(error):resolve(data)));
  setResult(new Blob([bytes as BlobPart],{type:'application/zip'}));setPartial(!!failures.length);setStatus(failures.length?(zh?`部分内容未导出（${failures.length} 项），详见压缩包 README，可联网后重新准备。`:`Partial export (${failures.length} missing items). See README; reconnect and retry.`):(zh?'备份已准备好，请保存到自己的设备。':'Backup ready. Save it to your device.'));
 }catch{setStatus(zh?'备份生成失败，请重试。':'Backup could not be created. Please retry.');}finally{setBusy(false);}}
 return <LifeModal title={zh?'导出与备份':'Export & backup'} onClose={()=>{if(!busy)onClose();}}><p>{zh?'导出心愿、清单、回忆文字、相册照片和待同步内容为 ZIP。照片为相册中保存的压缩版本；不会自动发布或删除任何内容。':'Export wishes, checklists, memory text, album photos and pending changes as a ZIP. Photos are the compressed copies stored in your album.'}</p><p className="life-muted">{zh?'备份含私人内容，请妥善保存。目前支持导出，不提供一键导入。':'Keep this private backup safe. Export is supported; automatic import is not available.'}</p><button className="secondary" disabled={busy} onClick={()=>void prepare()}>{busy?(zh?'正在准备…':'Preparing…'):(zh?'准备备份':'Prepare backup')}</button>{status&&<p role="status">{status}</p>}{result&&<button className="primary" onClick={()=>downloadBlob(result,`wish-together-${new Date().toISOString().slice(0,10)}${partial?'-partial':''}.zip`)}>{zh?'保存 ZIP':'Save ZIP'}</button>}</LifeModal>;
}
