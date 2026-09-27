import { supabase } from './supabase';
export async function spaceRows(table:string,space:string,columns='*'):Promise<Record<string,unknown>[]> {
  if(!supabase)throw new Error('Not connected');
  const all:Record<string,unknown>[]=[];
  for(let offset=0;;offset+=500){
    const {data,error}=await supabase.from(table).select(columns).eq('space_id',space).order(table==='wish_plans'?'wish_id':'id').range(offset,offset+499);
    if(error)throw error;
    const rows=data as unknown as Record<string,unknown>[];all.push(...rows);
    if(rows.length<500)return all;
  }
}
export function downloadBlob(blob:Blob,name:string){const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),60000);}
