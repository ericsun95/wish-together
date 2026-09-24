"use client";
import { useRef, useState, type PointerEvent, type ReactNode } from 'react';
import { PET_SIZE } from '@/lib/pet-play';

export type PetCarryDetail = { spaceId:string; petId:string; x:number; y:number; holding:boolean };
export function carryPet(detail:PetCarryDetail) { window.dispatchEvent(new CustomEvent('pet-carry',{detail})); }

export function PetCarry({spaceId,petId,zh,children}:{spaceId:string;petId:string;zh:boolean;children:ReactNode}) {
  const start=useRef<{x:number;y:number}|null>(null), moved=useRef(false);
  const [holding,setHolding]=useState(false);
  function send(event:PointerEvent<HTMLButtonElement>,holding:boolean) {
    carryPet({spaceId,petId,x:event.clientX-PET_SIZE/2,y:event.clientY-PET_SIZE/2,holding});
  }
  function finish(event:PointerEvent<HTMLButtonElement>) {
    if(moved.current)send(event,false);
    start.current=null;setHolding(false);
    if(event.currentTarget.hasPointerCapture(event.pointerId))event.currentTarget.releasePointerCapture(event.pointerId);
  }
  function release() {carryPet({spaceId,petId,x:window.innerWidth-PET_SIZE-20,y:window.innerHeight-PET_SIZE-24,holding:false});}
  return <><button type="button" className={`pet-carry ${holding?'is-holding':''}`} aria-label={zh?'拖动宠物到页面上，或点击叫它出来':'Drag your pet onto the page, or click to bring it out'} onPointerDown={event=>{
    if(!event.isPrimary||event.button!==0)return;
    start.current={x:event.clientX,y:event.clientY};moved.current=false;event.currentTarget.setPointerCapture(event.pointerId);
  }} onPointerMove={event=>{
    if(!start.current)return;
    if(!moved.current&&Math.hypot(event.clientX-start.current.x,event.clientY-start.current.y)<6)return;
    moved.current=true;setHolding(true);send(event,true);
  }} onPointerUp={finish} onPointerCancel={finish} onLostPointerCapture={event=>{if(start.current)finish(event);}} onClick={event=>{if(moved.current&&event.detail!==0){moved.current=false;return;}release();}}>{children}</button><p className="pet-drag-hint">{zh?'按住宠物拖出来 · 点一下也可以':'Hold and drag your pet out · or tap'}</p></>;
}
