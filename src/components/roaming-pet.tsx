"use client";

import { useCallback, useEffect, useRef, useState, type PointerEvent } from 'react';
import { supabase } from '@/lib/supabase';
import { keepPetOnScreen, PET_SIZE, PET_POSES, fullScreenPetTarget, type PetMood } from '@/lib/pet-play';
import type { PetCarryDetail } from './pet-carry';
import { PetPortrait } from './pet-portrait';

type Friend = { id:string; name: string; species: 'cat' | 'dog' };
type Mood = PetMood;

type SocialStep={spaceId:string;token:number;first:boolean;manual:boolean;mode:'greet'|'chase'|'nap';targets:{id:string;x:number;y:number}[];rest:boolean};
export function RoamingPet({spaceId,zh,onOpenHome}:{spaceId:string;zh:boolean;onOpenHome:()=>void}) {
  const [pets,setPets]=useState<Friend[]>([]);
  useEffect(()=>{
    let active=true,request=0;
    const load=async()=>{if(!supabase)return;const id=++request;try{const result=await supabase.from('space_pets').select('id,name,species').eq('space_id',spaceId).order('slot');if(active&&id===request&&!result.error)setPets(previous=>JSON.stringify(previous)===JSON.stringify(result.data||[])?previous:(result.data||[]));}catch{/* Keep known pets offline. */}};
    void load();const timer=setInterval(load,15000);window.addEventListener('pet-updated',load);window.addEventListener('focus',load);
    return()=>{active=false;clearInterval(timer);window.removeEventListener('pet-updated',load);window.removeEventListener('focus',load);};
  },[spaceId]);
  useEffect(()=>{
    const timers:ReturnType<typeof setTimeout>[]=[];let token=0;
    const socialize=(mode:SocialStep['mode'],manual:boolean)=>{
      if(pets.length<2)return;timers.splice(0).forEach(clearTimeout);const sequence=++token;
      const send=(phase:number)=>{
        const width=window.innerWidth,height=window.innerHeight;
        const spread=mode==='chase'?width-PET_SIZE-16:Math.min(width-PET_SIZE-16,(pets.length-1)*100);
        const origin=(width-PET_SIZE-spread)/2;
        const targets=pets.map((pet,index)=>({id:pet.id,x:origin+((index+(mode==='chase'?phase:0))%pets.length)/Math.max(1,pets.length-1)*spread,y:Math.max(8,height*.52+(index%2)*55)}));
        window.dispatchEvent(new CustomEvent('pet-social-step',{detail:{spaceId,token:sequence,first:phase===0,manual,mode,targets,rest:phase===3} satisfies SocialStep}));
      };
      send(0);for(let i=1;i<=3;i++)timers.push(setTimeout(()=>send(i),i*2600));
    };
    const request=(event:Event)=>{const detail=(event as CustomEvent<{spaceId:string;mode:SocialStep['mode']}>).detail;if(detail.spaceId===spaceId)socialize(detail.mode,true);};
    window.addEventListener('pet-social-request',request);
    const automatic=setInterval(()=>{if(!document.hidden&&!document.querySelector('.pet-home,[role="dialog"],input:focus,textarea:focus'))socialize('greet',false);},22000);
    return()=>{clearInterval(automatic);timers.forEach(clearTimeout);window.removeEventListener('pet-social-request',request);};
  },[pets,spaceId]);
  return <>{pets.map((pet,index)=><RoamingFriend key={pet.id} pet={pet} index={index} total={pets.length} spaceId={spaceId} zh={zh} onOpenHome={onOpenHome}/>)}</>;
}

function RoamingFriend({pet,index,total,spaceId,zh,onOpenHome}:{pet:Friend;index:number;total:number;spaceId:string;zh:boolean;onOpenHome:()=>void}) {
  const [position, setPosition] = useState({ x: 16, y: 16 });
  const [viewport, setViewport] = useState({ width: 390, height: 844 });
  const [mood, setMood] = useState<Mood>('idle');
  const [heading,setHeading] = useState(0);
  const roamStep = useRef(0);
  const released = useRef(false), socialToken=useRef<number|null>(null);
  const [menu, setMenu] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [paused, setPaused] = useState(false);
  const [sleeping, setSleeping] = useState(false);
  const [reduced, setReduced] = useState(true);
  const [obstructed, setObstructed] = useState(false);
  const [pageVisible, setPageVisible] = useState(true);
  const [dragging, setDragging] = useState(false);
  const [bubble, setBubble] = useState('');
  const [toy, setToy] = useState<{ x: number; y: number } | null>(null);
  const current = useRef(position), drag = useRef<{ x: number; y: number; startX: number; startY: number } | null>(null);
  const moved = useRef(false), motionTimer = useRef<ReturnType<typeof setTimeout> | null>(null), bubbleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const root = useRef<HTMLDivElement>(null), petButton = useRef<HTMLButtonElement>(null);
  const storageKey = `wish-together:pet-companion:${spaceId}:${pet.id}`;

  const cancelMotion = useCallback(() => {
    socialToken.current=null;
    if (motionTimer.current) clearTimeout(motionTimer.current);
    motionTimer.current = null; setToy(null); setMood('idle');
  }, []);
  function say(message: string) {
    if (bubbleTimer.current) clearTimeout(bubbleTimer.current);
    setBubble(message);
    bubbleTimer.current = setTimeout(() => setBubble(''), 3500);
  }
  function remember(nextHidden: boolean, nextPaused: boolean) {
    try { localStorage.setItem(storageKey, JSON.stringify({ hidden: nextHidden, paused: nextPaused })); } catch { /* Preferences are optional. */ }
  }
  const moveTo = useCallback((x: number, y: number) => {
    const next = keepPetOnScreen(x, y, window.innerWidth, window.innerHeight, PET_SIZE);
    setHeading(Math.atan2(next.x-current.current.x,next.y-current.current.y)); current.current = next; setPosition(next);
  }, []);

  useEffect(() => {
    try { const saved = JSON.parse(localStorage.getItem(storageKey) || (index===0?localStorage.getItem(`wish-together:pet-companion:${spaceId}`):null) || '{}'); setHidden(saved.hidden === true); setPaused(saved.paused === true); } catch { /* Use defaults. */ }
    moveTo(window.innerWidth-PET_SIZE-12-index*(PET_SIZE+8),window.innerHeight-PET_SIZE-12-(index%2)*80);
    const resize = () => { setViewport({ width: window.innerWidth, height: window.innerHeight }); moveTo(current.current.x, current.current.y); };
    resize(); window.addEventListener('resize', resize);
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    const motion = () => setReduced(media.matches); motion(); media.addEventListener('change', motion);
    const check = () => {
      const element = document.activeElement;
      setObstructed((!!document.querySelector('[role="dialog"], [aria-modal="true"]') || (!released.current && !!document.querySelector('.pet-playground'))) || (!root.current?.contains(element) && !!element?.matches('input, textarea, select, [contenteditable="true"]')));
      setPageVisible(!document.hidden);
    };
    const observer = new MutationObserver(check); observer.observe(document.body, { childList: true, subtree: true }); check();
    document.addEventListener('focusin', check); document.addEventListener('focusout', check); document.addEventListener('visibilitychange', check);
    return () => {
      window.removeEventListener('resize', resize); media.removeEventListener('change', motion); observer.disconnect();
      document.removeEventListener('focusin', check); document.removeEventListener('focusout', check); document.removeEventListener('visibilitychange', check);
      if (motionTimer.current) clearTimeout(motionTimer.current);
      if (bubbleTimer.current) clearTimeout(bubbleTimer.current);
    };
  }, [storageKey, moveTo,index,spaceId]);

  useEffect(() => {
    const carry = (event:Event) => {
      const detail=(event as CustomEvent<PetCarryDetail>).detail;
      if(detail.spaceId!==spaceId||detail.petId!==pet.id)return;
      socialToken.current=null;released.current=true;cancelMotion();setBubble('');setObstructed(false);setHidden(false);setPaused(true);setSleeping(false);setMenu(false);
      setDragging(detail.holding);moveTo(detail.x,detail.y);setHeading(-.25);setMood(detail.holding?'held':'sit');
      if(!detail.holding)try {localStorage.setItem(storageKey,JSON.stringify({hidden:false,paused:true}));}catch{/* Optional preference. */}
    };
    window.addEventListener('pet-carry',carry);
    return()=>window.removeEventListener('pet-carry',carry);
  },[spaceId,storageKey,cancelMotion,moveTo,pet.id]);

  useEffect(() => {
    if (hidden || paused || reduced || sleeping || menu || dragging || obstructed || !pageVisible) {
      return;
    }
    const timer = window.setInterval(() => {
      if (motionTimer.current || socialToken.current!==null) return;
      const target=fullScreenPetTarget(window.innerWidth,window.innerHeight,roamStep.current++); moveTo(target.x,target.y);
      setMood(roamStep.current%2?'run':'walk');
      motionTimer.current = setTimeout(() => { motionTimer.current = null; setMood('idle'); }, 2400);
    }, 6500);
    return () => window.clearInterval(timer);
  }, [hidden, paused, reduced, sleeping, menu, dragging, obstructed, pageVisible, cancelMotion, moveTo]);

  useEffect(() => { if (obstructed || !pageVisible || reduced) cancelMotion(); }, [obstructed, pageVisible, reduced, cancelMotion]);

  useEffect(() => {
    if (!menu) return;
    const close = (event: globalThis.PointerEvent) => { if (!root.current?.contains(event.target as Node)) setMenu(false); };
    const escape = (event: KeyboardEvent) => { if (event.key === 'Escape') { setMenu(false); petButton.current?.focus(); } };
    document.addEventListener('pointerdown', close); document.addEventListener('keydown', escape);
    return () => { document.removeEventListener('pointerdown', close); document.removeEventListener('keydown', escape); };
  }, [menu]);

  useEffect(()=>{
    const interact=(event:Event)=>{
      const detail=(event as CustomEvent<SocialStep>).detail;
      if(detail.spaceId!==spaceId||drag.current||dragging)return;
      if(detail.first){
        if(!detail.manual&&(paused||hidden||sleeping||menu||obstructed||reduced))return;
        socialToken.current=detail.token;
      }else if(socialToken.current!==detail.token)return;
      const target=detail.targets.find(item=>item.id===pet.id);if(!target)return;
      cancelMotion();socialToken.current=detail.token;
      if(detail.manual){released.current=true;setHidden(false);setObstructed(false);setPaused(false);setMenu(false);}
      setSleeping(detail.mode==='nap');moveTo(target.x,target.y);
      setHeading(index%2?-.7:.7);setMood(detail.rest?'sit':detail.mode==='chase'?'run':detail.mode==='nap'?'sleep':'happy');
      if(detail.first)say(zh?(detail.mode==='chase'?'来追我呀！':detail.mode==='nap'?'一起睡个好觉…':'小伙伴，贴贴 ♡'):(detail.mode==='chase'?'Catch me!':detail.mode==='nap'?'A cozy nap…':'Hello, little friend ♡'));
      if(detail.rest)socialToken.current=null;
    };
    window.addEventListener('pet-social-step',interact);return()=>window.removeEventListener('pet-social-step',interact);
  },[spaceId,pet.id,index,paused,hidden,sleeping,menu,obstructed,reduced,dragging,cancelMotion,moveTo,zh]);

  function pat() {
    cancelMotion(); setSleeping(false); setMood('happy');
    say(zh ? (pet?.species === 'cat' ? '呼噜呼噜～还要摸摸 ♡' : '汪！最喜欢你啦 ♡') : (pet?.species === 'cat' ? 'Purrr… more head pats, please ♡' : 'Woof! You’re my favorite ♡'));
  }
  function toss() {
    cancelMotion(); setSleeping(false); setMenu(false);
    const next = keepPetOnScreen(current.current.x > viewport.width / 2 ? 18 : viewport.width - 114, Math.max(viewport.height * .55, current.current.y), viewport.width, viewport.height, PET_SIZE);
    setToy(next); moveTo(next.x, next.y); setMood('walk'); say(zh ? '我来接住它！' : 'I’ll catch it!');
    motionTimer.current = setTimeout(() => { motionTimer.current = null; setToy(null); setMood('happy'); say(zh ? '接到啦！再来一次？🎾' : 'Got it! Again? 🎾'); }, reduced ? 150 : 2400);
  }
  function pointerDown(event: PointerEvent<HTMLButtonElement>) {
    if (!event.isPrimary || event.button !== 0) return;
    socialToken.current=null;
    const bounds = event.currentTarget.getBoundingClientRect();
    drag.current = { x: bounds.left, y: bounds.top, startX: event.clientX, startY: event.clientY }; moved.current = false;
    cancelMotion(); setDragging(true); moveTo(bounds.left,bounds.top);
    event.currentTarget.setPointerCapture(event.pointerId);
  }
  function pointerMove(event: PointerEvent<HTMLButtonElement>) {
    if (!drag.current) return;
    const dx = event.clientX - drag.current.startX, dy = event.clientY - drag.current.startY;
    if (!moved.current && Math.hypot(dx, dy) < 6) return;
    if (!moved.current) { moved.current = true; cancelMotion(); setSleeping(false); setDragging(true); setMenu(false); setPaused(true); remember(hidden, true); }
    moveTo(drag.current.x + dx, drag.current.y + dy); setHeading(-.25); setMood('held');
  }

  function finishDrag(event:PointerEvent<HTMLButtonElement>) {
    if(!drag.current)return;
    drag.current=null;setDragging(false);
    if(moved.current){setMood('sit');setHeading(-.25);say(zh?'在这里陪着你 ♡':'Right here with you ♡');}
    if(event.currentTarget.hasPointerCapture(event.pointerId))event.currentTarget.releasePointerCapture(event.pointerId);
  }

  if (!pet || obstructed || !pageVisible) return null;
  if (hidden) return <button type="button" className="pet-restore" style={{bottom:16+index*48}} aria-label={zh ? `叫${pet.name}出来` : `Show ${pet.name}`} onClick={() => { setHidden(false); remember(false, paused); }}>🐾<span>{zh ? '叫它出来' : 'Come out'}</span></button>;
  const panelLeft = Math.max(8, Math.min(position.x - 85, viewport.width - 280));
  const panelTop = Math.max(8, Math.min(position.y - 360, viewport.height - 380));
  return <div ref={root} className="roaming-pet-layer" data-quiet={paused || reduced}>
    {toy && <span className="roaming-pet-toy" style={{ left: toy.x + 34, top: toy.y + 66 }} aria-hidden="true">🎾</span>}
    <div className={`roaming-pet ${dragging ? 'is-dragging' : ''}`} style={{ left: position.x, top: position.y }}>
      {bubble && <span className="roaming-pet-bubble" style={position.y < 130 ? { top: 96, bottom: 'auto' } : undefined} role="status">{bubble}</span>}
      {sleeping && <span className="pet-sleep-label" aria-hidden="true">z Z z</span>}
      <button ref={petButton} type="button" className="roaming-pet-body" aria-label={zh ? `和${pet.name}互动` : `Play with ${pet.name}`} aria-expanded={menu} aria-controls={`pet-companion-controls-${pet.id}`} onPointerDown={pointerDown} onPointerMove={pointerMove} onPointerUp={finishDrag} onPointerCancel={finishDrag} onLostPointerCapture={finishDrag} onClick={event => { if (moved.current && event.detail !== 0) { moved.current = false; return; } cancelMotion(); setMenu(!menu); if (sleeping) say(zh ? '嘘，我在做一个甜甜的梦…' : 'Shh… dreaming sweet dreams…'); else say(zh ? '点点摸摸头，或者陪我玩吧！' : 'A head pat, or a little game?'); }} onKeyDown={event => {
        const delta: Record<string, [number, number]> = { ArrowLeft: [-24, 0], ArrowRight: [24, 0], ArrowUp: [0, -24], ArrowDown: [0, 24] };
        if (delta[event.key]) { event.preventDefault(); cancelMotion(); setPaused(true); remember(hidden, true); moveTo(position.x + delta[event.key][0], position.y + delta[event.key][1]); }
      }}><PetPortrait species={pet.species} mood={sleeping ? 'sleep' : mood} heading={heading}/></button>
      <span className="roaming-pet-name">{dragging ? (zh?'抱起来啦':'Picked up') : pet.name}</span>
    </div>
    {menu && <div id={`pet-companion-controls-${pet.id}`} className="pet-companion-controls" style={{ left: panelLeft, top: Math.max(8, panelTop) }} role="group" aria-label={zh ? '宠物互动' : 'Pet interactions'}>
      <div className="pet-companion-title"><strong>{pet.name}</strong><button type="button" aria-label={zh ? '关闭宠物菜单' : 'Close pet menu'} onClick={() => { setMenu(false); petButton.current?.focus(); }}>×</button></div>
      <div className="pet-companion-actions"><button type="button" onClick={pat}>{zh ? '🖐 摸摸头' : '🖐 Head pats'}</button><button type="button" onClick={toss}>{zh ? '🎾 丢个球' : '🎾 Toss a ball'}</button><button type="button" onClick={() => { cancelMotion(); setSleeping(!sleeping); setMenu(false); say(sleeping ? (zh ? '睡醒啦！来玩吧～' : 'Awake! Let’s play!') : (zh ? '晚安，梦里也有你 ♡' : 'Sweet dreams with you ♡')); }}>{sleeping ? (zh ? '☀️ 叫醒它' : '☀️ Wake up') : (zh ? '🌙 睡一会儿' : '🌙 Take a nap')}</button><button type="button" onClick={() => { setMenu(false); onOpenHome(); }}>{zh ? '🎮 去游乐场' : '🎮 Playground'}</button></div>
      <div className="pet-companion-actions">{PET_POSES.map(pose=><button type="button" key={pose.mood} onClick={()=>{cancelMotion();setSleeping(false);setMood(pose.mood);setHeading(0);setMenu(false);say(zh?pose.zh:pose.en);}}>{pose.emoji} {zh?pose.zh:pose.en}</button>)}</div>
      {total>1&&<button type="button" className="pet-friends-invite" onClick={()=>window.dispatchEvent(new CustomEvent('pet-social-request',{detail:{spaceId,mode:'chase'}}))}>{zh?'🐾 找伙伴一起玩':'🐾 Play with friends'}</button>}
      <label className="pet-roam-toggle"><input type="checkbox" checked={!paused && !reduced} disabled={reduced} onChange={event => { cancelMotion(); setPaused(!event.target.checked); remember(hidden, !event.target.checked); }}/>{zh ? '自由散步' : 'Wander around'}</label>
      <div className="pet-companion-footer"><small>{reduced ? (zh ? '已跟随系统减少动画' : 'Reduced motion is on') : (zh ? '拖动可挪位置 · 方向键也可以' : 'Drag to move · or use arrow keys')}</small><button type="button" onClick={() => { cancelMotion(); setMenu(false); setHidden(true); remember(true, paused); }}>{zh ? '收起' : 'Hide'}</button></div>
    </div>}
  </div>;
}
