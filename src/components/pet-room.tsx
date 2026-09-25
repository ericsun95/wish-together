"use client";
import { useEffect, useRef, useState, type PointerEvent, type KeyboardEvent } from 'react';
import { petImage } from '@/lib/pet-catalog';
import { advanceRoom, clampPosition, DEFAULT_ROOM, FURNITURE, initialActor, parseRoom, type Actor, type Furniture, type FurnitureKind } from '@/lib/pet-room';
import type { FamilyPet } from './pet-family';

function FurnitureArt({kind}:{kind:FurnitureKind}) {
  return <svg viewBox="0 0 120 80" aria-hidden="true">
    {kind==='bed'?<><ellipse cx="60" cy="52" rx="53" ry="23" fill="#ad7764"/><path d="M9 48 Q6 12 33 20 Q60 31 88 20 Q116 12 112 48" fill="#dbab8d"/><ellipse cx="60" cy="46" rx="42" ry="19" fill="#f4d4b6"/><path d="M30 46 Q60 60 90 46" fill="none" stroke="#e6bda0" strokeWidth="3"/></>:kind==='rug'?<><ellipse cx="60" cy="47" rx="55" ry="27" fill="#97b5a3"/><ellipse cx="60" cy="47" rx="46" ry="21" fill="none" stroke="#dce5d4" strokeWidth="2" strokeDasharray="4 3"/><path d="M41 47h38M60 36v22" stroke="#c5d7c1" strokeWidth="2"/></>:kind==='toy'?<><ellipse cx="60" cy="66" rx="23" ry="6" fill="#614b3820"/><circle cx="60" cy="42" r="25" fill="#dfa771"/><path d="M40 27 Q76 35 52 65M70 19 Q47 43 81 56" fill="none" stroke="#fff0d5" strokeWidth="4"/></>:<><ellipse cx="60" cy="61" rx="40" ry="10" fill="#614b3818"/><path d="M20 35 L29 60 Q60 74 91 60 L100 35" fill="#779dad"/><ellipse cx="60" cy="35" rx="40" ry="15" fill="#d7e8e9"/><ellipse cx="60" cy="37" rx="31" ry="10" fill="#9b7655"/>{[40,51,63,75].map((x,i)=><circle key={x} cx={x} cy={36+i%2*4} r="4" fill="#c6a17b"/>)}</>}
  </svg>;
}
export function PetRoom({pets,spaceId,zh}:{pets:FamilyPet[];spaceId:string;zh:boolean}) {
  const [furniture,setFurniture]=useState<Furniture[]>(DEFAULT_ROOM);
  const [actors,setActors]=useState<Record<string,Actor>>({});
  const [editing,setEditing]=useState(false),[paused,setPaused]=useState(false),[selected,setSelected]=useState('');
  const [ready,setReady]=useState(false),[saveError,setSaveError]=useState(false),[message,setMessage]=useState('');
  const floor=useRef<HTMLDivElement>(null),drag=useRef<{id:string;startX:number;startY:number;x:number;y:number}|null>(null);
  const key=`wish-together:pet-room:v1:${spaceId}`;
  useEffect(()=>{try{setFurniture(parseRoom(localStorage.getItem(key)));}catch{setSaveError(true);}setReady(true);setPaused(matchMedia('(prefers-reduced-motion: reduce)').matches);},[key]);
  useEffect(()=>{if(!ready)return;try{localStorage.setItem(key,JSON.stringify(furniture));setSaveError(false);}catch{setSaveError(true);}},[furniture,key,ready]);
  useEffect(()=>{
    if(editing||paused||!ready)return;
    const timer=setInterval(()=>{if(!document.hidden)setActors(current=>advanceRoom(pets,current,furniture,Date.now()));},400);
    return()=>clearInterval(timer);
  },[pets,furniture,editing,paused,ready]);
  function move(id:string,x:number,y:number){setFurniture(items=>items.map(f=>f.id===id?{...f,...clampPosition(x,y)}:f));}
  function start(event:PointerEvent<HTMLButtonElement>,f:Furniture){if(!editing)return;event.currentTarget.setPointerCapture(event.pointerId);drag.current={id:f.id,startX:event.clientX,startY:event.clientY,x:f.x,y:f.y};setSelected(f.id);}
  function dragging(event:PointerEvent<HTMLButtonElement>){const d=drag.current,rect=floor.current?.getBoundingClientRect();if(!d||!rect)return;move(d.id,d.x+(event.clientX-d.startX)/rect.width*100,d.y+(event.clientY-d.startY)/rect.height*100);}
  function keyMove(event:KeyboardEvent<HTMLButtonElement>,f:Furniture){if(!editing)return;const delta={ArrowLeft:[-2,0],ArrowRight:[2,0],ArrowUp:[0,-2],ArrowDown:[0,2]}[event.key];if(delta){event.preventDefault();move(f.id,f.x+delta[0],f.y+delta[1]);}}
  function petHello(pet:FamilyPet,index:number){setActors(current=>({...current,[pet.id]:{...(current[pet.id]||initialActor(index)),activity:'hello',furniture:undefined,until:Date.now()+4500}}));setMessage(zh?`${pet.name}${pet.species==='dog'?'开心地蹦了蹦！':pet.species==='cat'?'蹭了蹭你的手 ♡':'凑过来和你打招呼 ♡'}`:`${pet.name} comes over to say hello ♡`);}
  const chosen=furniture.find(f=>f.id===selected);
  return <section className="pet-room" aria-label={zh?'宠物小屋':'Pet room'}>
    <header className="pet-room-header"><div><span className="pet-room-eyebrow">{zh?'一起生活的日常':'LITTLE EVERYDAY MOMENTS'}</span><h3>{zh?'它们的小小家':'Their little home'}</h3></div><div className="pet-room-controls"><button type="button" aria-pressed={paused} onClick={()=>setPaused(!paused)}>{paused?(zh?'▶ 继续活动':'▶ Resume'):(zh?'Ⅱ 暂停活动':'Ⅱ Pause')}</button><button type="button" aria-pressed={editing} onClick={()=>{setEditing(!editing);setSelected('');}}>{editing?(zh?'✓ 布置完成':'✓ Done'):(zh?'布置小屋':'Decorate')}</button></div></header>
    <div ref={floor} className={`pet-room-floor ${editing?'is-editing':''} ${paused?'is-paused':''}`}>
      <div className="pet-room-window" aria-hidden="true"><span>☁</span></div><div className="pet-room-picture" aria-hidden="true">♡</div><span className="pet-room-plant" aria-hidden="true">🌿</span>
      <span className="pet-room-caption">{editing?(zh?'拖动家具，布置它们喜欢的角落':'Drag furniture into a cozy corner'):(zh?'阳光正好，慢慢陪伴':'A sunny spot, a little company')}</span>
      {furniture.map(f=><button type="button" key={f.id} className={`room-furniture room-${f.kind} ${selected===f.id?'is-selected':''}`} style={{left:`${f.x}%`,top:`${f.y}%`,zIndex:f.kind==='rug'?1:Math.round(f.y)}} disabled={!editing} aria-label={`${zh?FURNITURE.find(t=>t.kind===f.kind)!.zh:FURNITURE.find(t=>t.kind===f.kind)!.en}${editing?(zh?'，拖动或用方向键移动':', drag or use arrow keys'):''}`} aria-pressed={editing?selected===f.id:undefined} onClick={()=>setSelected(f.id)} onFocus={()=>{if(editing)setSelected(f.id);}} onPointerDown={e=>start(e,f)} onPointerMove={dragging} onPointerUp={()=>{drag.current=null;}} onPointerCancel={()=>{drag.current=null;}} onKeyDown={e=>keyMove(e,f)}><FurnitureArt kind={f.kind}/></button>)}
      {pets.map((pet,index)=>{const a=actors[pet.id]||initialActor(index),activity=editing?'rest':a.activity;const bubble=activity==='hello'?'♡':activity==='play'?'♫':activity==='eat'?'⋯':activity==='rest'&&a.furniture&&furniture.find(f=>f.id===a.furniture)?.kind==='bed'?'z Z':'';return <button type="button" key={pet.id} className={`room-pet room-pet-${pet.species} activity-${activity}`} style={{left:`${a.x}%`,top:`${a.y}%`,zIndex:Math.round(a.y)+2}} onClick={()=>petHello(pet,index)} disabled={editing} aria-label={zh?`摸摸${pet.name}`:`Pet ${pet.name}`} data-activity={activity}><span className="room-pet-bubble" aria-hidden="true">{bubble}</span><img src={petImage(pet.species,pet.appearance)} alt="" draggable={false}/><span className="room-pet-name">{pet.name}</span></button>;})}
    </div>
    {editing&&<div className="pet-room-editor"><div className="pet-room-shop">{FURNITURE.map(f=><button type="button" key={f.kind} disabled={furniture.length>=12} onClick={()=>{const id=`${f.kind}-${Date.now()}-${Math.random().toString(36).slice(2,6)}`;setFurniture(items=>[...items,{id,kind:f.kind,x:48+Math.random()*8,y:52+Math.random()*8}]);setSelected(id);}}><FurnitureArt kind={f.kind}/><span>＋ {zh?f.zh:f.en}</span></button>)}</div><div className="pet-room-edit-actions"><span>{furniture.length}/12 · {zh?'选中家具后可拖动或按方向键':'Select, then drag or use arrow keys'}</span><button type="button" disabled={!chosen} onClick={()=>{setFurniture(items=>items.filter(f=>f.id!==selected));setSelected('');}}>{zh?'收起选中家具':'Put away selected'}</button></div></div>}
    <footer><p role="status">{message||(zh?'点一点它们，打个招呼。猫咪爱休息，狗狗爱玩球。':'Tap a pet to say hello. Cats love resting; dogs love playing.')}</p><small role={saveError?'alert':undefined}>{saveError?(zh?'无法保存布局，刷新后可能丢失。':'Could not save this layout. It may be lost on reload.'):(zh?'布局自动保存在当前设备 · 小屋活动不消耗食物或增加经验':'Layout saved on this device · Room activities do not use food or award XP')}</small></footer>
  </section>;
}
