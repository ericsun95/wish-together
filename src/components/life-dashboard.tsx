"use client";
import { useCallback, useEffect, useState } from 'react';
import { CalendarHeart, Shuffle } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { localToday, pickWish, type LifeWish, type WishPlan } from '@/lib/life';
import { LifeModal } from './life-ui';
import { Anniversaries } from './anniversaries';
import { SharedPet } from './shared-pet';
import { Memories } from './memories';
export function LifeDashboard({spaceId,zh,wishes,onWish,onBackground}:{spaceId:string;zh:boolean;wishes:LifeWish[];onWish:(wish:LifeWish)=>void;onBackground:(photo:string)=>Promise<void>}){
 const [tab,setTab]=useState<'dates'|'album'|'pet'>('dates');
 return <div className="life-dashboard"><div className="life-subnav"><button aria-pressed={tab==='dates'} onClick={()=>setTab('dates')}>{zh?'💕 纪念日':'💕 Special dates'}</button><button aria-pressed={tab==='album'} onClick={()=>setTab('album')}>{zh?'📷 回忆相册':'📷 Memories'}</button><button aria-pressed={tab==='pet'} onClick={()=>setTab('pet')}>{zh?'🐾 我们的小窝':'🐾 Our pet'}</button></div><DateAndRandom spaceId={spaceId} zh={zh} wishes={wishes} onWish={onWish}/>{tab==='dates'?<Anniversaries spaceId={spaceId} zh={zh}/>:tab==='pet'?<SharedPet key={spaceId} spaceId={spaceId} zh={zh}/>:<Memories spaceId={spaceId} zh={zh} wishes={wishes} onBackground={onBackground}/>}</div>;
}
export function DateAndRandom({spaceId,zh,wishes,onWish}:{spaceId:string;zh:boolean;wishes:LifeWish[];onWish:(wish:LifeWish)=>void}){
 const [plans,setPlans]=useState<WishPlan[]>([]),[open,setOpen]=useState(false),[category,setCategory]=useState(''),[picked,setPicked]=useState<LifeWish|null>(null),[error,setError]=useState('');
 const load=useCallback(async()=>{const result=await supabase?.from('wish_plans').select('*').eq('space_id',spaceId).order('date_on');if(result?.error)setError(zh?'约会安排暂时无法加载。':'Date plans unavailable.');else{setError('');setPlans(result?.data||[]);}},[spaceId,zh]);
 useEffect(()=>{void load();const timer=window.setInterval(load,15000);window.addEventListener('life-changed',load);return()=>{window.clearInterval(timer);window.removeEventListener('life-changed',load);};},[load]);
 const upcoming=wishes.filter(w=>w.status!=='done').map(w=>({wish:w,plan:plans.find(p=>p.wish_id===w.id),date:w.plannedDate})).filter(x=>x.date&&x.date>=localToday()).sort((a,b)=>a.date.localeCompare(b.date))[0];
 const categories=[...new Set(wishes.filter(w=>w.status!=='done'&&w.category).map(w=>w.category))];
 return <><div className="date-random-bar"><button className="next-date" onClick={()=>{if(upcoming)onWish(upcoming.wish);}} disabled={!upcoming}><CalendarHeart size={22}/><span><small>{zh?'下一次约会':'OUR NEXT DATE'}</small><strong>{upcoming?`${upcoming.date} · ${upcoming.wish.title}`:(zh?'给一个心愿安排日期吧':'Give a wish a date')}</strong>{upcoming?.plan?.budget!=null&&<small>{upcoming.plan.currency} {Number(upcoming.plan.budget).toFixed(2)}</small>}</span></button><button className="secondary" onClick={()=>{setOpen(true);setPicked(null);}}><Shuffle size={16}/>{zh?'今天做什么？':'What shall we do?'}</button></div>{error&&<p className="life-muted">{error}</p>}
 {open&&<LifeModal title={zh?'把选择交给小幸运':'A little serendipity'} onClose={()=>setOpen(false)}><label>{zh?'想做哪一类':'Choose a category'}<select value={category} onChange={e=>{setCategory(e.target.value);setPicked(null);}}><option value="">{zh?'全部未完成心愿':'All unfinished wishes'}</option>{categories.map(c=><option key={c}>{c}</option>)}</select></label><div className="random-result"><span>✧</span><h3>{picked?.title||(zh?'下一次小冒险，会是什么？':'What will our next adventure be?')}</h3>{picked?.category&&<p>{picked.category}</p>}</div>{!wishes.some(w=>w.status!=='done'&&(!category||w.category===category))?<p>{zh?'这个分类里还没有未完成的心愿。':'No unfinished wishes in this category.'}</p>:<div className="life-actions"><button className="primary" onClick={()=>setPicked(pickWish(wishes,category,picked?.id))}><Shuffle size={15}/>{picked?(zh?'再抽一个':'Pick again'):(zh?'抽一个心愿':'Pick a wish')}</button>{picked&&<button className="secondary" onClick={()=>{setOpen(false);onWish(picked);}}>{zh?'就这个，安排起来':'Let’s plan it'}</button>}</div>}</LifeModal>}
 </>;
}
