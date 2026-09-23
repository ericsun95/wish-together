"use client";
import { useEffect, useId, useRef, type ReactNode } from 'react';
import { X } from 'lucide-react';
import type { LifeMember } from '@/lib/life';
export function LifeModal({ title, onClose, children }: { title:string; onClose:()=>void; children:ReactNode }) {
  const ref=useRef<HTMLDivElement>(null), id=useId();
  useEffect(()=>{
    const previous=document.activeElement as HTMLElement | null;
    ref.current?.focus();
    const old=document.body.style.overflow; document.body.style.overflow='hidden';
    return ()=>{document.body.style.overflow=old;previous?.focus();};
  },[]);
  return <div className="dialog-backdrop life-backdrop" onMouseDown={e=>{if(e.target===e.currentTarget)onClose();}}>
    <div className="dialog life-dialog" role="dialog" aria-modal="true" aria-labelledby={id} ref={ref} tabIndex={-1} onKeyDown={e=>{
      if(e.key==='Escape'){e.stopPropagation();onClose();}
      if(e.key==='Tab'){
        const nodes=Array.from(e.currentTarget.querySelectorAll<HTMLElement>('button:not(:disabled),input:not(:disabled),textarea:not(:disabled),select:not(:disabled),a[href]')).filter(n=>n.offsetParent!==null);
        const first=nodes[0],last=nodes[nodes.length-1];
        if(e.shiftKey && (document.activeElement===first || document.activeElement===ref.current)){e.preventDefault();last?.focus();}
        else if(!e.shiftKey && document.activeElement===last){e.preventDefault();first?.focus();}
      }
    }}><div className="dialog-head"><h2 id={id}>{title}</h2><button type="button" className="icon-button" aria-label="关闭 / Close" onClick={onClose}><X size={19}/></button></div>{children}</div>
  </div>;
}
export function MiniAvatar({member}:{member?:LifeMember}) {
  const src=member?.custom_avatar || member?.avatar_url;
  return <span className="mini-avatar">{(member?.display_name || '♡').slice(0,1)}{src && <img src={src} alt="" referrerPolicy="no-referrer" onError={e=>{e.currentTarget.style.display='none';}}/>}</span>;
}
