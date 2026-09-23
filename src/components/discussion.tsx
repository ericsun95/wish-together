"use client";
import { useCallback, useEffect, useState } from 'react';
import { Send, Trash2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { REACTIONS, type LifeMember } from '@/lib/life';
import { MiniAvatar } from './life-ui';
type Comment = { id:string; created_by:string; body:string; created_at:string };
type Reaction = { comment_id:string; user_id:string; emoji:string };
export function Discussion({spaceId,target,zh}:{spaceId:string;target:{wish_id?:string;anniversary_id?:string;memory_id?:string};zh:boolean}) {
  const [rows,setRows]=useState<Comment[]>([]),[reactions,setReactions]=useState<Reaction[]>([]),[members,setMembers]=useState<LifeMember[]>([]);
  const [userId,setUserId]=useState(''),[body,setBody]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState(''),[limit,setLimit]=useState(30),[more,setMore]=useState(false);
  const key=Object.keys(target)[0],id=Object.values(target)[0];
  const load=useCallback(async()=>{
    if(!supabase)return;
    const {data,error}=await supabase.from('discussion_comments').select('id,created_by,body,created_at').eq('space_id',spaceId).eq(key,id).order('created_at',{ascending:false}).limit(limit+1);
    if(error){setError(zh?'留言加载失败，请重试。':'Could not load comments.');return;}
    const shown=(data||[]).slice(0,limit);setMore((data||[]).length>limit);setRows(shown.reverse());
    const result=shown.length?await supabase.from('comment_reactions').select('comment_id,user_id,emoji').in('comment_id',shown.map(x=>x.id)):{data:[],error:null};
    if(!result.error)setReactions(result.data||[]);
  },[spaceId,key,id,limit,zh]);
  useEffect(()=>{let active=true;void supabase?.auth.getUser().then(({data})=>{if(active)setUserId(data.user?.id||'');});void supabase?.from('space_members').select('user_id,role,display_name,avatar_url,custom_avatar').eq('space_id',spaceId).then(({data})=>{if(active)setMembers(data||[]);});return()=>{active=false;};},[spaceId]);
  useEffect(()=>{void load();const timer=window.setInterval(load,10000);return()=>window.clearInterval(timer);},[load]);
  async function send(e:React.FormEvent){e.preventDefault();if(!supabase||!userId||!body.trim()||busy)return;setBusy(true);setError('');try{const {error}=await supabase.from('discussion_comments').insert({space_id:spaceId,created_by:userId,[key]:id,body:body.trim()});if(error)throw error;setBody('');await load();}catch{setError(zh?'发送失败，内容已保留。':'Could not send. Your draft is saved.');}finally{setBusy(false);}}
  async function react(commentId:string,emoji:string){if(!supabase||busy||!userId)return;setBusy(true);setError('');try{const exists=reactions.some(x=>x.comment_id===commentId&&x.user_id===userId&&x.emoji===emoji);const result=exists?await supabase.from('comment_reactions').delete().eq('comment_id',commentId).eq('user_id',userId).eq('emoji',emoji):await supabase.from('comment_reactions').insert({comment_id:commentId,space_id:spaceId,user_id:userId,emoji});if(result.error)throw result.error;await load();}catch{setError(zh?'表情更新失败，请重试。':'Could not update reaction.');}finally{setBusy(false);}}
  async function remove(id:string){if(!supabase||busy)return;setBusy(true);setError('');try{const {error}=await supabase.from('discussion_comments').delete().eq('id',id).eq('created_by',userId);if(error)throw error;await load();}catch{setError(zh?'删除失败，请重试。':'Could not delete comment.');}finally{setBusy(false);}}
  return <section className="discussion"><h3>{zh?'说说我们的想法':'A little conversation'}</h3>{more&&<button className="text-action" onClick={()=>setLimit(n=>n+30)}>{zh?'加载更早的留言':'Earlier comments'}</button>}
    {!rows.length&&<p className="life-muted">{zh?'第一句，想对 TA 说什么？':'Leave the first little note.'}</p>}
    <div className="comment-list">{rows.map(row=>{const member=members.find(m=>m.user_id===row.created_by);return <article className="comment" key={row.id}><MiniAvatar member={member}/><div className="comment-main"><header><strong>{member?.display_name||(zh?'另一半':'Partner')}</strong><time>{new Date(row.created_at).toLocaleString(zh?'zh-CN':'en-US',{month:'short',day:'numeric',hour:'2-digit',minute:'2-digit'})}</time>{row.created_by===userId&&<button className="icon-button" disabled={busy} aria-label={zh?'删除留言':'Delete comment'} onClick={()=>void remove(row.id)}><Trash2 size={13}/></button>}</header><p>{row.body}</p><div className="reaction-row">{REACTIONS.map(emoji=>{const relevant=reactions.filter(x=>x.comment_id===row.id&&x.emoji===emoji);return <button key={emoji} disabled={busy} aria-label={`${emoji} ${zh?'回应':'reaction'}`} aria-pressed={relevant.some(x=>x.user_id===userId)} onClick={()=>void react(row.id,emoji)}>{emoji}{relevant.length>0&&<small>{relevant.length}</small>}</button>;})}</div></div></article>;})}</div>
    <form onSubmit={send}><label>{zh?'留言':'Your message'}<textarea maxLength={2000} rows={2} value={body} onChange={e=>setBody(e.target.value)} placeholder={zh?'这周六一起去吧 💕':'How about Saturday? 💕'}/></label><div className="comment-compose"><div className="emoji-compose">{REACTIONS.map(emoji=><button type="button" key={emoji} aria-label={`${zh?'插入':'Insert'} ${emoji}`} onClick={()=>setBody(v=>(v+emoji).slice(0,2000))}>{emoji}</button>)}</div><button className="primary" disabled={busy||!userId||!body.trim()}><Send size={14}/>{zh?'发送':'Send'}</button></div></form>
    {error&&<p className="form-error" role="alert">{error}</p>}
  </section>;
}
