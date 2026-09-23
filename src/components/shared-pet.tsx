"use client";

import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react';
import { Heart, Pencil, RefreshCw, Sparkles } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import type { LifeMember } from '@/lib/life';
import { LifeModal, MiniAvatar } from './life-ui';

type Species = 'cat' | 'dog';
type Action = 'feed' | 'play' | 'cuddle';
type Pet = { space_id: string; name: string; species: Species; experience: number; created_at: string };
type Care = { id: string; user_id: string; action: Action; care_day: string; created_at: string };
const actions: { id: Action; emoji: string; zh: string; en: string; pastZh: string; pastEn: string }[] = [
  { id: 'feed', emoji: '🥣', zh: '喂食', en: 'Feed', pastZh: '喂了一顿饭', pastEn: 'served a little meal' },
  { id: 'play', emoji: '🧶', zh: '陪玩', en: 'Play', pastZh: '陪它玩了一会儿', pastEn: 'shared some playtime' },
  { id: 'cuddle', emoji: '💕', zh: '抱抱', en: 'Cuddle', pastZh: '给了它一个抱抱', pastEn: 'gave a warm cuddle' },
];

function PetPortrait({ species, happy = false }: { species: Species; happy?: boolean }) {
  return <svg viewBox="0 0 280 240" className={`pet-portrait ${happy ? 'pet-happy' : ''}`} aria-hidden="true">
    <ellipse cx="140" cy="221" rx="79" ry="10" fill="currentColor" opacity=".08"/>
    <path d="M183 186Q246 160 232 198Q220 216 184 207" fill="none" stroke="#d89964" strokeWidth="18" strokeLinecap="round"/>
    <ellipse cx="141" cy="175" rx="63" ry="49" fill="#eeb880"/>
    <ellipse cx="142" cy="185" rx="37" ry="30" fill="#fff1d9"/>
    {species === 'cat' ? <><path d="M72 93L66 28L119 60M166 60L215 28L211 96" fill="#eeb880" stroke="#eeb880" strokeWidth="10" strokeLinejoin="round"/><path d="M79 74L77 46L102 64M182 65L204 46L202 76" fill="#ec9691"/></> : <><ellipse cx="74" cy="99" rx="26" ry="53" transform="rotate(17 74 99)" fill="#b7764b"/><ellipse cx="208" cy="99" rx="26" ry="53" transform="rotate(-17 208 99)" fill="#b7764b"/></>}
    <ellipse cx="141" cy="107" rx="76" ry="65" fill="#efbd86"/>
    <ellipse cx="141" cy="129" rx="40" ry="29" fill="#fff1d9"/>
    <path d="M130 116Q141 109 152 116L141 126Z" fill="#805c4c" stroke="#805c4c" strokeWidth="4" strokeLinejoin="round"/>
    <path d="M141 125V132M125 132Q132 145 141 132Q151 145 158 132" fill="none" stroke="#805c4c" strokeWidth="3.5" strokeLinecap="round"/>
    <path d="M100 103Q106 95 113 103M169 103Q176 95 182 103" fill="none" stroke="#684b3f" strokeWidth="5" strokeLinecap="round"/>
    <ellipse cx="98" cy="120" rx="13" ry="7" fill="#e9958b" opacity=".6"/><ellipse cx="184" cy="120" rx="13" ry="7" fill="#e9958b" opacity=".6"/>
    {species === 'cat' && <path d="M87 128L55 122M86 138L53 143M195 128L225 122M196 138L228 143" stroke="#b7764b" strokeWidth="2.5" strokeLinecap="round"/>}
    <ellipse cx="109" cy="211" rx="23" ry="12" fill="#fff1d9"/><ellipse cx="175" cy="211" rx="23" ry="12" fill="#fff1d9"/>
    <path d="M120 164Q142 173 162 164" stroke="var(--accent)" strokeWidth="7" fill="none"/><circle cx="142" cy="173" r="8" fill="#f4ce6c"/>
    <path d="M239 51C225 36 209 57 239 75C269 57 253 36 239 51Z" fill="var(--accent)" opacity=".65"/>
  </svg>;
}

export function SharedPet({ spaceId, zh }: { spaceId: string; zh: boolean }) {
  return <PetHome key={spaceId} spaceId={spaceId} zh={zh}/>;
}

function PetHome({ spaceId, zh }: { spaceId: string; zh: boolean }) {
  const [pet, setPet] = useState<Pet | null>(null);
  const [journal, setJournal] = useState<Care[]>([]);
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
        supabase.from('space_pets').select('space_id,name,species,experience,created_at').eq('space_id', spaceId).maybeSingle(),
        supabase.from('pet_care').select('id,user_id,action,care_day,created_at').eq('space_id', spaceId).order('created_at', { ascending: false }).limit(30),
        supabase.from('space_members').select('user_id,role,display_name,avatar_url,custom_avatar').eq('space_id', spaceId),
        supabase.auth.getUser(),
      ]);
      if (!mounted.current || request !== requestId.current || writing.current) return;
      if (petResult.error || careResult.error || memberResult.error || authResult.error || !authResult.data.user) throw new Error('load');
      setPet(petResult.data as Pet | null);
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
      const result = pet
        ? await supabase.from('space_pets').update({ name: name.trim() }).eq('space_id', spaceId).select('space_id').single()
        : await supabase.from('space_pets').insert({ space_id: spaceId, name: name.trim(), species, created_by: userId });
      if (result.error) throw result.error;
      succeeded = true;
      if (mounted.current) { setRenaming(false); setName(''); setNotice(zh ? (pet ? '新名字已保存。' : '欢迎来到你们的小世界！') : (pet ? 'New name saved.' : 'Welcome to your little world!')); }
    } catch {
      if (mounted.current) setError(pet
        ? (zh ? '名字未能保存，请重试。' : 'Could not save the name. Please retry.')
        : (zh ? '未能领养，另一半可能已领养了宠物。请刷新后重试。' : 'Could not adopt. Your partner may have adopted already. Refresh and try again.'));
    } finally {
      writing.current = false;
      if (mounted.current) setBusy(false);
    }
    if (succeeded && mounted.current) await load();
  }

  async function care(action: Action) {
    if (!supabase || writing.current || !pet) return;
    writing.current = true; requestId.current++; setBusy(true); setError(''); setNotice('');
    let succeeded = false;
    try {
      const { data, error: careError } = await supabase.rpc('care_for_pet', { p_space: spaceId, p_action: action });
      if (careError) throw careError;
      succeeded = true;
      if (mounted.current) setNotice(data
        ? (zh ? `${pet.name}收到了你的爱，成长值 +10 ♡` : `${pet.name} feels loved. +10 growth ♡`)
        : (zh ? '今天已经做过这项互动啦，明天再来吧。' : 'You have done this today. Come back tomorrow.'));
    } catch {
      if (mounted.current) setError(zh ? '互动暂未确认，请重试；重复操作不会重复计分。' : 'Could not confirm this interaction. Retrying will not count it twice.');
    } finally {
      writing.current = false;
      if (mounted.current) setBusy(false);
    }
    if (succeeded && mounted.current) await load();
  }

  const level = pet ? Math.floor(pet.experience / 100) + 1 : 1;
  const progress = pet ? pet.experience % 100 : 0;
  const nextReset = new Date(`${today}T00:00:00Z`); nextReset.setUTCDate(nextReset.getUTCDate() + 1);
  return <section className="life-section pet-home" aria-label={zh ? '我们的宠物' : 'Our pet'}>
    <div className="life-section-head"><div><span className="eyebrow">A LITTLE LOVE, EVERY DAY</span><h2>{zh ? '一起，把它宠大' : 'A little friend, raised together'}</h2></div><button className="text-action" disabled={busy} onClick={() => void load()}><RefreshCw size={14}/>{zh ? '刷新' : 'Refresh'}</button></div>
    {error && <p role="alert" className="pet-error">{error}</p>}
    {notice && <p role="status" className="pet-notice">{notice}</p>}
    {!loaded ? <p className="life-empty">{error ? (zh ? '点击刷新，再来看看它。' : 'Refresh to try again.') : (zh ? '正在布置宠物的小家…' : 'Getting your pet’s home ready…')}</p> : !pet ?
      <form className="pet-adoption" onSubmit={saveName}>
        <div className="pet-scene"><PetPortrait species={species}/><p>{zh ? '一只小可爱，两个人的牵挂' : 'One little friend. Two loving hearts.'}</p></div>
        <div className="pet-adoption-form"><h3>{zh ? '领养你们的第一只宠物' : 'Adopt your shared pet'}</h3><p className="life-muted">{zh ? '一起取名字、喂食、陪玩，把每天的小小陪伴，变成它的成长。' : 'Name, feed and play with your pet. Your everyday care helps it grow.'}</p>
          <fieldset className="pet-species"><legend>{zh ? '想和谁一起生活？' : 'Who will join your home?'}</legend>{(['cat', 'dog'] as const).map(value => <button type="button" key={value} disabled={busy} aria-pressed={species === value} onClick={() => setSpecies(value)}>{value === 'cat' ? '🐱' : '🐶'} {value === 'cat' ? (zh ? '猫咪' : 'Cat') : (zh ? '狗狗' : 'Dog')}</button>)}</fieldset>
          <label className="pet-name-label">{zh ? '宠物名字' : 'Pet name'}<input required maxLength={24} value={name} disabled={busy} placeholder={zh ? '比如：汤圆、Mochi' : 'For example, Mochi'} onChange={e => setName(e.target.value)}/></label>
          <button className="primary" disabled={busy || !name.trim()}><Heart size={16}/>{busy ? (zh ? '正在迎接…' : 'Welcoming…') : (zh ? '带它回家' : 'Bring them home')}</button>
          <p className="life-muted">{zh ? '每个空间共同养一只，领养后名字可以再改。' : 'One shared pet per space. You can rename them later.'}</p>
        </div>
      </form> : <>
        <div className="pet-card"><div className="pet-scene"><span className="pet-level">Lv. {level}</span><PetPortrait species={pet.species} happy={!!notice}/><p>{zh ? '有你们在，每天都很开心' : 'Every day is happier with you two'}</p></div>
          <div className="pet-details"><div className="pet-title"><h3>{pet.name}</h3><button className="icon-button" disabled={busy} aria-label={zh ? '修改宠物名字' : 'Rename pet'} onClick={() => { setName(pet.name); setRenaming(true); }}><Pencil size={15}/></button></div>
            <p className="life-muted">{zh ? (level < 3 ? '初来乍到的小宝贝' : level < 6 ? '越来越亲密的小伙伴' : '你们最默契的家人') : (level < 3 ? 'Your sweet new arrival' : level < 6 ? 'Your growing little companion' : 'One of the family')}</p>
            <div className="pet-growth-label"><span><Sparkles size={14}/> {zh ? '共同成长' : 'Growing together'}</span><span>{progress} / 100</span></div><progress max={100} value={progress} aria-label={zh ? '升到下一级的成长值' : 'Growth toward next level'}/>
            <p className="life-muted">{zh ? `再积累 ${100 - progress} 点成长值，升到 Lv. ${level + 1}` : `${100 - progress} more growth to reach Lv. ${level + 1}`}</p>
            <div className="pet-care-actions">{actions.map(action => { const done = journal.some(row => row.user_id === userId && row.care_day === today && row.action === action.id); return <button key={action.id} disabled={busy || done} onClick={() => void care(action.id)}><span aria-hidden="true">{action.emoji}</span><strong>{zh ? action.zh : action.en}</strong><small>{done ? (zh ? '今天已完成 ✓' : 'Done today ✓') : '+10'}</small></button>; })}</div>
            <p className="life-muted">{zh ? '每人每天每项一次；没来照顾也不会扣分。' : 'Each of you can do each action once daily. No penalties for days away.'}<br/>{zh ? '下次互动重置：' : 'Next daily reset: '}{nextReset.toLocaleString(zh ? 'zh-CN' : 'en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
          </div>
        </div>
        <div className="pet-together"><h3>{zh ? '今天的共同照顾' : 'Today’s care, from both of you'}</h3><div className="pet-member-grid">{members.map(member => <div className="pet-member" key={member.user_id}><MiniAvatar member={member}/><div><strong>{member.display_name || (zh ? '另一半' : 'Partner')}{member.user_id === userId ? (zh ? '（你）' : ' (you)') : ''}</strong><span>{actions.map(action => { const done = journal.some(row => row.user_id === member.user_id && row.care_day === today && row.action === action.id); return <small key={action.id} className={done ? 'pet-done' : ''}>{action.emoji} {zh ? action.zh : action.en}{done ? ' ✓' : ' ·'}</small>; })}</span></div></div>)}</div></div>
        <div className="pet-journal"><h3>{zh ? '被爱着的小日常' : 'Little moments of love'}</h3>{!journal.length ? <p className="life-empty">{zh ? '从第一个抱抱开始，写下你们的共同日常。' : 'Start your shared story with a first cuddle.'}</p> : <ol>{journal.slice(0, 12).map(row => { const member = members.find(m => m.user_id === row.user_id), action = actions.find(a => a.id === row.action); return <li key={row.id}><span className="pet-journal-icon" aria-hidden="true">{action?.emoji}</span><div><p><strong>{member?.display_name || (zh ? '另一半' : 'Partner')}</strong> {zh ? action?.pastZh : action?.pastEn}</p><time dateTime={row.created_at}>{new Date(row.created_at).toLocaleString(zh ? 'zh-CN' : 'en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</time></div><small>+10</small></li>; })}</ol>}</div>
      </>}
    {renaming && pet && <LifeModal title={zh ? '给它一个新名字' : 'A new name for your pet'} onClose={() => { if (!busy) setRenaming(false); }}><form className="pet-rename-form" onSubmit={saveName}>{error && <p role="alert" className="pet-error">{error}</p>}<label>{zh ? '宠物名字' : 'Pet name'}<input required maxLength={24} value={name} disabled={busy} onChange={e => setName(e.target.value)}/></label><button className="primary" disabled={busy || !name.trim()}>{zh ? '保存名字' : 'Save name'}</button></form></LifeModal>}
  </section>;
}
