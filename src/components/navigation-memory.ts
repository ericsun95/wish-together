'use client';
import {useEffect,useRef,useState} from 'react';
import {defaultNavigation,readNavigation,scrollKey,type NavigationState,type NavigationMemory} from '@/lib/navigation-memory';
export function useNavigationMemory(scope:string|null){
 const [snapshot,setSnapshot]=useState<{scope:string|null;memory:NavigationMemory}>({scope:null,memory:{state:defaultNavigation(),positions:{}}});
 const current=useRef(snapshot),restoring=useRef(false);current.current=snapshot;
 const loaded=snapshot.scope===scope;const state=loaded?snapshot.memory.state:defaultNavigation();const key=scrollKey(state);
 function persist(value:typeof snapshot){if(value.scope)try{sessionStorage.setItem(value.scope,JSON.stringify(value.memory));}catch{/* Navigation still works when storage is unavailable. */}}
 function capture(){const value=current.current;if(value.scope!==scope||restoring.current||document.body.style.overflow==='hidden')return;value.memory.positions[scrollKey(value.memory.state)]=window.scrollY;persist(value);}
 function update(patch:Partial<NavigationState>){const previous=current.current;if(previous.scope!==scope)return;const next={...previous.memory.state,...patch};if(scrollKey(next)!==scrollKey(previous.memory.state)){capture();restoring.current=true;}const value={scope,memory:{...previous.memory,state:next}};current.current=value;setSnapshot(value);persist(value);}
 useEffect(()=>{const memory=scope?readNavigation(sessionStorage,scope):{state:defaultNavigation(),positions:{}};const next={scope,memory};current.current=next;setSnapshot(next);},[scope]);
 useEffect(()=>{
  if(!loaded||!scope)return;const value=current.current;const y=value.memory.positions[key]||0;restoring.current=true;
  let stopped=false,frame=0;
  const restore=()=>{if(stopped)return;cancelAnimationFrame(frame);frame=requestAnimationFrame(()=>{if(stopped)return;window.scrollTo({top:y,behavior:'auto'});});};
  const stop=()=>{stopped=true;restoring.current=false;observer.disconnect();cancelAnimationFrame(frame);};
  const observer=new ResizeObserver(restore);observer.observe(document.body);restore();
  const timer=setTimeout(stop,5000);
  const save=()=>{if(restoring.current||document.body.style.overflow==='hidden')return;const v=current.current;if(v.scope!==scope||scrollKey(v.memory.state)!==key)return;v.memory.positions[key]=window.scrollY;persist(v);};
  window.addEventListener('scroll',save,{passive:true});window.addEventListener('pagehide',save);
  for(const event of ['wheel','touchstart','pointerdown','keydown'])window.addEventListener(event,stop,{passive:true});
  return()=>{clearTimeout(timer);stop();window.removeEventListener('scroll',save);window.removeEventListener('pagehide',save);for(const event of ['wheel','touchstart','pointerdown','keydown'])window.removeEventListener(event,stop);};
 },[scope,key,loaded]);
 return {state,update,capture,loaded};
}
