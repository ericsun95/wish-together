"use client";
import { useEffect, useRef, useState, type ReactNode } from 'react';
import type { PetGameScene, PetMood } from '@/lib/pet-play';

export function Pet3D({species, mood='idle', heading=0, game, children}: {species:'cat'|'dog'; mood?:PetMood; heading?:number; game?:PetGameScene; children?:ReactNode}) {
  const canvas=useRef<HTMLCanvasElement>(null), latest=useRef({mood,heading,game}), redraw=useRef<()=>void>(()=>{});
  const [ready,setReady]=useState(false);
  latest.current={mood,heading,game};
  const gameMode=!!game;
  useEffect(()=>{
    let disposed=false, failed=false, frame=0, last=0, visible=true;
    let engine: ReturnType<typeof import('@/lib/pet-3d-scene').createPetScene>|undefined;
    const node=canvas.current!;
    const media=matchMedia('(prefers-reduced-motion: reduce)');
    const draw=(now:number)=>{
      frame=0;
      if(disposed||failed||!engine||document.hidden||!visible)return;
      if(now-last>=32||media.matches){engine.update(latest.current,now/1000,last?Math.min((now-last)/1000,.1):1,media.matches);last=now;}
      if(!media.matches)frame=requestAnimationFrame(draw);
    };
    const wake=()=>{cancelAnimationFrame(frame);frame=requestAnimationFrame(draw);};
    redraw.current=wake;
    const resize=new ResizeObserver(()=>{const box=node.getBoundingClientRect();engine?.resize(Math.max(1,box.width),Math.max(1,box.height));wake();});
    resize.observe(node);
    const intersection=new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;wake();});intersection.observe(node);
    const lost=(event:Event)=>{event.preventDefault();failed=true;cancelAnimationFrame(frame);setReady(false);};
    node.addEventListener('webglcontextlost',lost);
    document.addEventListener('visibilitychange',wake);media.addEventListener('change',wake);
    void import('@/lib/pet-3d-scene').then(module=>{
      if(disposed)return;
      try{engine=module.createPetScene(node,species,gameMode);const box=node.getBoundingClientRect();engine.resize(Math.max(1,box.width),Math.max(1,box.height));engine.update(latest.current,0,1,media.matches);setReady(true);wake();}catch{setReady(false);}
    }).catch(()=>{if(!disposed)setReady(false);});
    return()=>{disposed=true;cancelAnimationFrame(frame);resize.disconnect();intersection.disconnect();document.removeEventListener('visibilitychange',wake);media.removeEventListener('change',wake);node.removeEventListener('webglcontextlost',lost);engine?.dispose();};
  },[species,gameMode]);
  useEffect(()=>redraw.current(),[mood,heading,game]);
  return <div className={`pet-3d ${gameMode?'pet-3d-game':''}`} data-renderer={ready?'3d':'fallback'}><canvas ref={canvas} aria-hidden="true" style={{opacity:ready?1:0}}/>{!ready&&children}</div>;
}
