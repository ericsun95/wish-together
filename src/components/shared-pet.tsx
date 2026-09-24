"use client";

import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react';
import { Heart, Pencil, RefreshCw, Sparkles } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import type { LifeMember } from '@/lib/life';
import { LifeModal, MiniAvatar } from './life-ui';
import { PET_POSES, type PetMood } from '@/lib/pet-play';
import { PetCarry } from './pet-carry';
import { PetPortrait } from './pet-portrait';
import { PetFamily } from './pet-family';
import { PetPlayground } from './pet-playground';

type Species = 'cat' | 'dog';
type Action = 'feed' | 'play' | 'cuddle';
type Pet = { id:string; slot:number; space_id: string; name: string; species: Species; experience: number; created_at: string };
type Care = { pet_id:string; id: string; user_id: string; action: Action; care_day: string; created_at: string };
const actions: { id: Action; emoji: string; zh: string; en: string; pastZh: string; pastEn: string }[] = [
  { id: 'feed', emoji: '🥣', zh: '喂食', en: 'Feed', pastZh: '喂了一顿饭', pastEn: 'served a little meal' },
  { id: 'play', emoji: '🧶', zh: '陪玩', en: 'Play', pastZh: '陪它玩了一会儿', pastEn: 'shared some playtime' },
  { id: 'cuddle', emoji: '💕', zh: '抱抱', en: 'Cuddle', pastZh: '给了它一个抱抱', pastEn: 'gave a warm cuddle' },
];


export function SharedPet({ spaceId, zh }: { spaceId: string; zh: boolean }) {
  return <PetHome key={spaceId} spaceId={spaceId} zh={zh}/>;
}

function PetHome({ spaceId, zh }: { spaceId: string; zh: boolean }) {
  const [pose,setPose]=useState<PetMood>('sit');
  const [pets,setPets]=useState<Pet[]>([]);
  const [selected,setSelected]=useState('');
  const [adopting,setAdopting]=useState(false);
  const pet=pets.find(item=>item.id===selected)||pets[0]||null;
  const [allJournal, setJournal] = useState<Care[]>([]);
  const [members, setMembers] = useState<LifeMember[]>([]);
  const [userId, setUserId] = useState('');
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  const [species, setSpecies] = useState<Species>('cat');
  const [name, setName] = useState('');
  const [renaming, setRenaming] = useState(false);
  const [today, setToday] = useState(() => new Date().toISOString().slice(0, 10));
  const mounted = useRef(false), writing = useRef(false), requestId = useRef(0);
  const load = useCallback(async () => {
    if (!supabase || writing.current) return;
    const request = ++requestId.current;
    try {
      const [petResult, careResult, memberResult, authResult] = await Promise.all([
        supabase.from('space_pets').select('id,slot,space_id,name,species,experience,created_at').eq('space_id', spaceId).order('slot'),
        supabase.from('pet_care').select('id,pet_id,user_id,action,care_day,created_at').eq('space_id', spaceId).order('created_at', { ascending: false }).limit(120),
        supabase.from('space_members').select('user_id,role,display_name,avatar_url,custom_avatar').eq('space_id', spaceId),
        supabase.auth.getUser(),
      ]);
      if (!mounted.current || request !== requestId.current || writing.current) return;
      if (petResult.error || careResult.error || memberResult.error || authResult.error || !authResult.data.user) throw new Error('load');
      setPets((petResult.data||[]) as Pet[]);
      setJournal((careResult.data || []) as Care[]);
      setMembers(memberResult.data || []);
      setUserId(authResult.data.user.id);
      setToday(new Date().toISOString().slice(0, 10));
      setLoaded(true);
      setError('');
    } catch {
      if (mounted.current && request === requestId.current) setError(zh ? '暂时无法加载宠物，请重试。' : 'Could not load your pet. Please retry.');
    }
  }, [spaceId, zh]);

  useEffect(() => {
    mounted.current = true;
    void load();
    const timer = window.setInterval(load, 15000);
    window.addEventListener('focus', load);
    return () => { mounted.current = false; requestId.current++; window.clearInterval(timer); window.removeEventListener('focus', load); };
  }, [load]);

  async function saveName(event: FormEvent) {
    event.preventDefault();
    if (!supabase || writing.current || !userId || !name.trim()) return;
    writing.current = true; requestId.current++; setBusy(true); setError(''); setNotice('');
    let succeeded = false;
    try {
      const result = renaming && pet
        ? await supabase.from('space_pets').update({ name: name.trim() }).eq('space_id', spaceId).eq('id',pet.id).select('id').single()
        : await supabase.from('space_pets').insert({ space_id: spaceId, name: name.trim(), species, created_by: userId }).select('id').single();
      if (result.error) throw result.error;
      succeeded = true;
      if(result.data?.id)setSelected(result.data.id);
      if (mounted.current) { setAdopting(false); setRenaming(false); setName(''); setNotice(zh ? (renaming ? '新名字已保存。' : '欢迎来到你们的小世界！') : (renaming ? 'New name saved.' : 'Welcome to your little world!')); }
    } catch {
      if (mounted.current) setError(renaming
        ? (zh ? '名字未能保存，请重试。' : 'Could not save the name. Please retry.')
        : (zh ? '未能领养，小窝可能已满。请刷新后重试。' : 'Could not adopt. Your family may be full. Refresh and try again.'));
    } finally {
      writing.current = false;
      if (mounted.current) setBusy(false);
    }
    if (succeeded && mounted.current) { await load(); window.dispatchEvent(new Event('pet-updated')); }
  }

  async function care(action: Action, replay = false) {
    if (!supabase || writing.current || !pet) return;
    writing.current = true; requestId.current++; setBusy(true); setError(''); setNotice('');
    let succeeded = false;
    try {
      const { data, error: careError } = await supabase.rpc('care_for_named_pet', { p_space: spaceId, p_pet:pet.id, p_action: action });
      if (careError) throw careError;
      succeeded = true;
      if (mounted.current) setNotice(data
        ? (zh ? `${pet.name}收到了你的爱，成长值 +10 ♡` : `${pet.name} feels loved. +10 growth ♡`)
        : (replay ? (zh ? '玩得好开心！今天的陪玩成长已领取，可以继续玩哦。' : 'That was fun! Today’s play growth is already collected. Keep playing!') : (zh ? '今天已经做过这项互动啦，明天再来吧。' : 'You have done this today. Come back tomorrow.')));
    } catch {
      if (mounted.current) setError(zh ? '互动暂未确认，请重试；重复操作不会重复计分。' : 'Could not confirm this interaction. Retrying will not count it twice.');
    } finally {
      writing.current = false;
      if (mounted.current) setBusy(false);
    }
    if (succeeded && mounted.current) { await load(); window.dispatchEvent(new Event('pet-updated')); }
  }

  const journal=allJournal.filter(row=>row.pet_id===pet?.id);
  const level = pet ? Math.floor(pet.experience / 100) + 1 : 1;
  const progress = pet ? pet.experience % 100 : 0;
  const nextReset = new Date(`${today}T00:00:00Z`); nextReset.setUTCDate(nextReset.getUTCDate() + 1);
  return <section className="life-section pet-home" aria-label={zh ? '我们的宠物' : 'Our pet'}>
    <div className="life-section-head"><div><span className="eyebrow">A LITTLE LOVE, EVERY DAY</span><h2>{zh ? '一起，把它宠大' : 'A little friend, raised together'}</h2></div><button className="text-action" disabled={busy} onClick={() => void load()}><RefreshCw size={14}/>{zh ? '刷新' : 'Refresh'}</button></div>
    {error && <p role="alert" className="pet-error">{error}</p>}
    {notice && <p role="status" className="pet-notice">{notice}</p>}
    {loaded && pets.length>0 && <><div className="pet-family-picker" role="group" aria-label={zh?'选择宠物':'Choose a pet'}>{pets.map(item=><button type="button" key={item.id} disabled={busy} aria-pressed={!adopting&&item.id===pet?.id} onClick={()=>{setSelected(item.id);setAdopting(false);setNotice('');setPose('sit');}}>{item.species==='cat'?'🐱':'🐶'} {item.name}<small>Lv. {Math.floor(item.experience/100)+1}</small></button>)}{pets.length<4&&<button type="button" disabled={busy} onClick={()=>{setAdopting(true);setName('');setNotice('');}}>＋ {zh?'再领养一只':'Adopt another'}</button>}</div><PetFamily pets={pets} spaceId={spaceId} zh={zh}/></>}
    {!loaded ? <p className="life-empty">{error ? (zh ? '点击刷新，再来看看它。' : 'Refresh to try again.') : (zh ? '正在布置宠物的小家…' : 'Getting your pet’s home ready…')}</p> : !pet || adopting ?
      <form className="pet-adoption" onSubmit={saveName}>
        <div className="pet-scene"><PetPortrait species={species}/><p>{zh ? '一只小可爱，两个人的牵挂' : 'One little friend. Two loving hearts.'}</p></div>
        <div className="pet-adoption-form"><h3>{zh ? (pets.length?'给它找个新伙伴':'领养你们的第一只宠物') : 'Welcome a new friend'}</h3><p className="life-muted">{zh ? '一起取名字、喂食、陪玩，把每天的小小陪伴，变成它的成长。' : 'Name, feed and play with your pet. Your everyday care helps it grow.'}</p>
          <fieldset className="pet-species"><legend>{zh ? '想和谁一起生活？' : 'Who will join your home?'}</legend>{(['cat', 'dog'] as const).map(value => <button type="button" key={value} disabled={busy} aria-pressed={species === value} onClick={() => setSpecies(value)}>{value === 'cat' ? '🐱' : '🐶'} {value === 'cat' ? (zh ? '猫咪' : 'Cat') : (zh ? '狗狗' : 'Dog')}</button>)}</fieldset>
          <label className="pet-name-label">{zh ? '宠物名字' : 'Pet name'}<input required maxLength={24} value={name} disabled={busy} placeholder={zh ? '比如：汤圆、Mochi' : 'For example, Mochi'} onChange={e => setName(e.target.value)}/></label>
          <button className="primary" disabled={busy || !name.trim()}><Heart size={16}/>{busy ? (zh ? '正在迎接…' : 'Welcoming…') : (zh ? '带它回家' : 'Bring them home')}</button>
          <p className="life-muted">{zh ? '小窝最多住 4 只，每只都有自己的名字和成长记录。' : 'Up to 4 pets, each with their own name and growth.'}</p>
          {pets.length>0&&<button type="button" className="text-action" disabled={busy} onClick={()=>setAdopting(false)}>{zh?'暂时不领养':'Cancel'}</button>}
        </div>
      </form> : <>
        <div className="pet-card"><div className="pet-scene"><span className="pet-level">Lv. {level}</span><PetCarry petId={pet.id} spaceId={spaceId} zh={zh}><PetPortrait species={pet.species} happy={!!notice} mood={pose}/></PetCarry><div className="pet-pose-picker" role="group" aria-label={zh?"宠物姿态":"Pet poses"}>{PET_POSES.map(item=><button type="button" key={item.mood} aria-pressed={pose===item.mood} onClick={()=>{setNotice('');setPose(item.mood);}}>{item.emoji} {zh?item.zh:item.en}</button>)}</div><p>{zh ? '有你们在，每天都很开心' : 'Every day is happier with you two'}</p></div>
          <div className="pet-details"><div className="pet-title"><h3>{pet.name}</h3><button className="icon-button" disabled={busy} aria-label={zh ? '修改宠物名字' : 'Rename pet'} onClick={() => { setName(pet.name); setRenaming(true); }}><Pencil size={15}/></button></div>
            <p className="life-muted">{zh ? (level < 3 ? '初来乍到的小宝贝' : level < 6 ? '越来越亲密的小伙伴' : '你们最默契的家人') : (level < 3 ? 'Your sweet new arrival' : level < 6 ? 'Your growing little companion' : 'One of the family')}</p>
            <div className="pet-growth-label"><span><Sparkles size={14}/> {zh ? '共同成长' : 'Growing together'}</span><span>{progress} / 100</span></div><progress max={100} value={progress} aria-label={zh ? '升到下一级的成长值' : 'Growth toward next level'}/>
            <p className="life-muted">{zh ? `再积累 ${100 - progress} 点成长值，升到 Lv. ${level + 1}` : `${100 - progress} more growth to reach Lv. ${level + 1}`}</p>
            <div className="pet-care-actions">{actions.map(action => { const done = journal.some(row => row.user_id === userId && row.care_day === today && row.action === action.id); return <button key={action.id} disabled={busy || done} onClick={() => void care(action.id)}><span aria-hidden="true">{action.emoji}</span><strong>{zh ? action.zh : action.en}</strong><small>{done ? (zh ? '今天已完成 ✓' : 'Done today ✓') : '+10'}</small></button>; })}</div>
            <p className="life-muted">{zh ? '每人每天每项一次；没来照顾也不会扣分。' : 'Each of you can do each action once daily. No penalties for days away.'}<br/>{zh ? '下次互动重置：' : 'Next daily reset: '}{nextReset.toLocaleString(zh ? 'zh-CN' : 'en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
          </div>
        </div>
        <PetPlayground key={pet.id} species={pet.species} name={pet.name} zh={zh} busy={busy} onComplete={() => care('play', true)}/>
        <div className="pet-together"><h3>{zh ? '今天的共同照顾' : 'Today’s care, from both of you'}</h3><div className="pet-member-grid">{members.map(member => <div className="pet-member" key={member.user_id}><MiniAvatar member={member}/><div><strong>{member.display_name || (zh ? '另一半' : 'Partner')}{member.user_id === userId ? (zh ? '（你）' : ' (you)') : ''}</strong><span>{actions.map(action => { const done = journal.some(row => row.user_id === member.user_id && row.care_day === today && row.action === action.id); return <small key={action.id} className={done ? 'pet-done' : ''}>{action.emoji} {zh ? action.zh : action.en}{done ? ' ✓' : ' ·'}</small>; })}</span></div></div>)}</div></div>
        <div className="pet-journal"><h3>{zh ? '被爱着的小日常' : 'Little moments of love'}</h3>{!journal.length ? <p className="life-empty">{zh ? '从第一个抱抱开始，写下你们的共同日常。' : 'Start your shared story with a first cuddle.'}</p> : <ol>{journal.slice(0, 12).map(row => { const member = members.find(m => m.user_id === row.user_id), action = actions.find(a => a.id === row.action); return <li key={row.id}><span className="pet-journal-icon" aria-hidden="true">{action?.emoji}</span><div><p><strong>{member?.display_name || (zh ? '另一半' : 'Partner')}</strong> {zh ? action?.pastZh : action?.pastEn}</p><time dateTime={row.created_at}>{new Date(row.created_at).toLocaleString(zh ? 'zh-CN' : 'en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</time></div><small>+10</small></li>; })}</ol>}</div>
      </>}
    {renaming && pet && <LifeModal title={zh ? '给它一个新名字' : 'A new name for your pet'} onClose={() => { if (!busy) setRenaming(false); }}><form className="pet-rename-form" onSubmit={saveName}>{error && <p role="alert" className="pet-error">{error}</p>}<label>{zh ? '宠物名字' : 'Pet name'}<input required maxLength={24} value={name} disabled={busy} onChange={e => setName(e.target.value)}/></label><button className="primary" disabled={busy || !name.trim()}>{zh ? '保存名字' : 'Save name'}</button></form></LifeModal>}
  </section>;
}
