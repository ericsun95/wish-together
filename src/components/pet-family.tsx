"use client";
import { useEffect, useState } from 'react';
import { PetPortrait } from './pet-portrait';
import type { PetSpecies } from '@/lib/pet-catalog';
import type { PetMood } from '@/lib/pet-play';
export type FamilyPet={id:string;name:string;species:PetSpecies;appearance?:string};
export type SocialMode='greet'|'chase'|'nap';
export function invitePetFriends(spaceId:string,mode:SocialMode) {window.dispatchEvent(new CustomEvent('pet-social-request',{detail:{spaceId,mode}}));}
export function PetFamily({pets,spaceId,zh}:{pets:FamilyPet[];spaceId:string;zh:boolean}) {
  const [mode,setMode]=useState<SocialMode>('greet');
  const [active,setActive]=useState(false);
  useEffect(()=>{if(!active)return;const timer=setTimeout(()=>setActive(false),mode==='nap'?12000:8000);return()=>clearTimeout(timer);},[active,mode]);
  if(pets.length<2)return null;
  const mood:PetMood=!active?'sit':mode==='chase'?'run':mode==='nap'?'sleep':'happy';
  return <section className="pet-family" aria-label={zh?'伙伴们的活动':'Friends together'}><div className={`pet-family-yard ${active?`is-${mode}`:''}`}>
    <span className="pet-family-heart" aria-hidden="true">{active&&mode==='greet'?'♡ ♡':active&&mode==='nap'?'z Z z':'✿'}</span>
    {pets.map((pet,index)=><div className="pet-family-friend" key={pet.id} style={{animationDelay:`${-index*1.3}s`}}><PetPortrait lightweight species={pet.species} appearance={pet.appearance} mood={mood} heading={index%2?-.55:.55}/><span>{pet.name}</span></div>)}
    </div><p role="status">{active?(zh?(mode==='greet'?'凑近闻闻，蹭一蹭，认识新朋友 ♡':mode==='chase'?'你追我赶，轮流当小尾巴！':'挨在一起，做个暖暖的梦…'):(mode==='greet'?'A little sniff and a friendly nuzzle ♡':mode==='chase'?'Taking turns chasing each other!':'A cozy nap together…')):(zh?'有小伙伴在，小窝更热闹了':'Life is sweeter with little friends')}</p>
    <div className="pet-family-actions">{(['greet','chase','nap'] as const).map(value=><button type="button" key={value} aria-pressed={active&&mode===value} onClick={()=>{setMode(value);setActive(true);}}>{zh?({greet:'💕 互相贴贴',chase:'🐾 追逐玩耍',nap:'🌙 一起午睡'}[value]):({greet:'💕 Nuzzle',chase:'🐾 Chase',nap:'🌙 Nap'}[value])}</button>)}<button type="button" onClick={()=>invitePetFriends(spaceId,mode)}>{zh?'一起出来玩 ↗':'Come out together ↗'}</button></div>
  </section>;
}
