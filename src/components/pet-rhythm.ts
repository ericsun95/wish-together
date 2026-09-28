'use client';
import {useEffect,useState} from 'react';
import {petPhase,PET_RHYTHMS} from '@/lib/pet-rhythm';
export function usePetRhythm(){
  const [phase,setPhase]=useState<ReturnType<typeof petPhase>>('day');
  const [override,setOverride]=useState<{phase:typeof phase;sleep:boolean}|null>(null);
  useEffect(()=>{const update=()=>setPhase(petPhase(new Date().getHours()));update();const timer=setInterval(update,30000);window.addEventListener('focus',update);document.addEventListener('visibilitychange',update);return()=>{clearInterval(timer);window.removeEventListener('focus',update);document.removeEventListener('visibilitychange',update);};},[]);
  useEffect(()=>setOverride(null),[phase]);
  const manual=override?.phase===phase;
  return {phase,description:manual?(override.sleep?{emoji:'☾',zh:'先睡一小会儿，醒来再陪你',en:'A cozy little nap before more company'}:{emoji:'♡',zh:'醒着呢，在这里陪你一会儿',en:'Awake, and keeping you company'}):PET_RHYTHMS[phase],sleeping:manual?override.sleep:phase==='night',manual,setSleeping:(sleep:boolean)=>setOverride({phase,sleep}),resume:()=>setOverride(null)};
}
